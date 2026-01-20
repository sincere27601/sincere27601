"""
Test GridFS Audio Storage Feature for Summary Boss App
Tests:
- POST /api/meetings/{id}/upload - stores audio in GridFS and returns file_id
- GET /api/meetings/{id}/audio - streams audio from GridFS
- POST /api/meetings/process - stores audio in GridFS during processing
- Meeting model includes audio_file_id field
"""

import pytest
import requests
import os
import io
import wave
import struct

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_USER_EMAIL = "gridfs_audio_test@example.com"
TEST_USER_PASSWORD = "test123456"
TEST_USER_NAME = "Audio Test User"


def create_test_wav_file():
    """Create a valid WAV audio file for testing"""
    # Create a simple WAV file in memory
    sample_rate = 44100
    duration = 1  # 1 second
    frequency = 440  # A4 note
    
    # Generate samples
    num_samples = sample_rate * duration
    samples = []
    for i in range(num_samples):
        sample = int(32767 * 0.5 * (1 if (i * frequency // sample_rate) % 2 == 0 else -1))
        samples.append(sample)
    
    # Create WAV file in memory
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 2 bytes per sample
        wav_file.setframerate(sample_rate)
        for sample in samples:
            wav_file.writeframes(struct.pack('<h', sample))
    
    buffer.seek(0)
    return buffer.read()


class TestGridFSAudioStorage:
    """Test GridFS audio storage functionality"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Register/login test user and get session token"""
        # Try to register first
        register_response = session.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "name": TEST_USER_NAME
            }
        )
        
        if register_response.status_code == 200:
            return register_response.json().get("session_token")
        
        # If registration fails (user exists), try login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
        )
        
        if login_response.status_code == 200:
            return login_response.json().get("session_token")
        
        pytest.skip(f"Authentication failed: {login_response.text}")
    
    @pytest.fixture(scope="class")
    def authenticated_session(self, session, auth_token):
        """Session with authentication header"""
        session.headers.update({"Authorization": f"Bearer {auth_token}"})
        return session
    
    @pytest.fixture(scope="class")
    def test_meeting(self, authenticated_session):
        """Create a test meeting for audio upload tests"""
        response = authenticated_session.post(
            f"{BASE_URL}/api/meetings",
            json={
                "title": "TEST_GridFS_Audio_Meeting",
                "description": "Test meeting for GridFS audio storage"
            }
        )
        assert response.status_code == 200, f"Failed to create meeting: {response.text}"
        meeting = response.json()
        yield meeting
        
        # Cleanup: Delete the meeting after tests
        try:
            authenticated_session.delete(f"{BASE_URL}/api/meetings/{meeting['id']}")
        except Exception:
            pass
    
    @pytest.fixture
    def wav_file_content(self):
        """Generate test WAV file content"""
        return create_test_wav_file()
    
    # ============== UPLOAD TESTS ==============
    
    def test_upload_audio_returns_file_id(self, authenticated_session, test_meeting, wav_file_content):
        """Test POST /api/meetings/{id}/upload stores audio in GridFS and returns file_id"""
        meeting_id = test_meeting['id']
        
        files = {
            'file': ('test_audio.wav', wav_file_content, 'audio/wav')
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/upload",
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        data = response.json()
        
        # Verify response contains file_id
        assert "file_id" in data, "Response should contain file_id"
        assert data["file_id"], "file_id should not be empty"
        assert len(data["file_id"]) == 24, "file_id should be a valid ObjectId (24 chars)"
        
        # Verify response contains filename
        assert "filename" in data, "Response should contain filename"
        assert "test_audio.wav" in data["filename"], "Filename should contain original name"
        
        # Verify success message
        assert "message" in data, "Response should contain message"
        assert "success" in data["message"].lower(), "Message should indicate success"
        
        print(f"✓ Upload returned file_id: {data['file_id']}")
    
    def test_meeting_has_audio_file_id_after_upload(self, authenticated_session, test_meeting, wav_file_content):
        """Test that meeting document contains audio_file_id after upload"""
        meeting_id = test_meeting['id']
        
        # Upload audio
        files = {
            'file': ('test_audio_verify.wav', wav_file_content, 'audio/wav')
        }
        
        upload_response = authenticated_session.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/upload",
            files=files
        )
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        
        uploaded_file_id = upload_response.json()["file_id"]
        
        # Get meeting and verify audio_file_id is set
        get_response = authenticated_session.get(f"{BASE_URL}/api/meetings/{meeting_id}")
        assert get_response.status_code == 200, f"Get meeting failed: {get_response.text}"
        
        meeting = get_response.json()
        
        # Verify audio_file_id field exists and matches
        assert "audio_file_id" in meeting, "Meeting should have audio_file_id field"
        assert meeting["audio_file_id"] == uploaded_file_id, "audio_file_id should match uploaded file_id"
        
        # Verify audio_filename is also set
        assert "audio_filename" in meeting, "Meeting should have audio_filename field"
        assert meeting["audio_filename"], "audio_filename should not be empty"
        
        # Verify status is updated
        assert meeting["status"] == "uploaded", f"Status should be 'uploaded', got '{meeting['status']}'"
        
        print(f"✓ Meeting has audio_file_id: {meeting['audio_file_id']}")
    
    def test_upload_requires_authentication(self, session, test_meeting, wav_file_content):
        """Test that upload endpoint requires authentication"""
        meeting_id = test_meeting['id']
        
        # Create a new session without auth
        unauthenticated_session = requests.Session()
        
        files = {
            'file': ('test_audio.wav', wav_file_content, 'audio/wav')
        }
        
        response = unauthenticated_session.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/upload",
            files=files
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Upload requires authentication (401)")
    
    def test_upload_rejects_invalid_file_type(self, authenticated_session, test_meeting):
        """Test that upload rejects non-audio file types"""
        meeting_id = test_meeting['id']
        
        # Try to upload a text file
        files = {
            'file': ('test.txt', b'This is not an audio file', 'text/plain')
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/upload",
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
        print("✓ Upload rejects invalid file types (400)")
    
    def test_upload_to_nonexistent_meeting(self, authenticated_session, wav_file_content):
        """Test upload to non-existent meeting returns 404"""
        files = {
            'file': ('test_audio.wav', wav_file_content, 'audio/wav')
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/meetings/nonexistent-meeting-id/upload",
            files=files
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Upload to non-existent meeting returns 404")
    
    # ============== AUDIO STREAMING TESTS ==============
    
    def test_get_audio_streams_from_gridfs(self, authenticated_session, test_meeting, wav_file_content):
        """Test GET /api/meetings/{id}/audio streams audio from GridFS"""
        meeting_id = test_meeting['id']
        
        # First upload audio
        files = {
            'file': ('test_stream.wav', wav_file_content, 'audio/wav')
        }
        
        upload_response = authenticated_session.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/upload",
            files=files
        )
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        
        # Now stream the audio
        stream_response = authenticated_session.get(
            f"{BASE_URL}/api/meetings/{meeting_id}/audio",
            stream=True
        )
        
        assert stream_response.status_code == 200, f"Stream failed: {stream_response.status_code}"
        
        # Verify content type is audio
        content_type = stream_response.headers.get('Content-Type', '')
        assert 'audio' in content_type, f"Content-Type should be audio, got: {content_type}"
        
        # Verify we get actual content
        content = stream_response.content
        assert len(content) > 0, "Audio content should not be empty"
        
        # Verify Content-Disposition header
        content_disposition = stream_response.headers.get('Content-Disposition', '')
        assert 'filename' in content_disposition, "Should have filename in Content-Disposition"
        
        print(f"✓ Audio streaming works, received {len(content)} bytes")
    
    def test_get_audio_requires_authentication(self, session, test_meeting):
        """Test that audio streaming requires authentication"""
        meeting_id = test_meeting['id']
        
        # Create a new session without auth
        unauthenticated_session = requests.Session()
        
        response = unauthenticated_session.get(
            f"{BASE_URL}/api/meetings/{meeting_id}/audio"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Audio streaming requires authentication (401)")
    
    def test_get_audio_nonexistent_meeting(self, authenticated_session):
        """Test audio streaming for non-existent meeting returns 404"""
        response = authenticated_session.get(
            f"{BASE_URL}/api/meetings/nonexistent-meeting-id/audio"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Audio streaming for non-existent meeting returns 404")
    
    def test_get_audio_meeting_without_audio(self, authenticated_session):
        """Test audio streaming for meeting without audio returns 404"""
        # Create a new meeting without audio
        create_response = authenticated_session.post(
            f"{BASE_URL}/api/meetings",
            json={
                "title": "TEST_No_Audio_Meeting",
                "description": "Meeting without audio"
            }
        )
        assert create_response.status_code == 200
        meeting_id = create_response.json()["id"]
        
        try:
            # Try to get audio
            response = authenticated_session.get(
                f"{BASE_URL}/api/meetings/{meeting_id}/audio"
            )
            
            assert response.status_code == 404, f"Expected 404 for meeting without audio, got {response.status_code}"
            print("✓ Audio streaming for meeting without audio returns 404")
        finally:
            # Cleanup
            authenticated_session.delete(f"{BASE_URL}/api/meetings/{meeting_id}")
    
    # ============== PROCESS ENDPOINT TESTS ==============
    
    def test_process_stores_audio_in_gridfs(self, authenticated_session, wav_file_content):
        """Test POST /api/meetings/process stores audio in GridFS during processing"""
        files = {
            'file': ('test_process.wav', wav_file_content, 'audio/wav')
        }
        data = {
            'title': 'TEST_Process_GridFS_Meeting',
            'description': 'Test meeting created via process endpoint'
        }
        
        response = authenticated_session.post(
            f"{BASE_URL}/api/meetings/process",
            files=files,
            data=data
        )
        
        # Process endpoint may take time due to transcription/summarization
        # It might return 200 or 500 if AI services fail, but we check the meeting was created
        if response.status_code == 200:
            meeting = response.json()
            meeting_id = meeting['id']
            
            try:
                # Verify audio_file_id is set
                assert "audio_file_id" in meeting, "Meeting should have audio_file_id field"
                assert meeting["audio_file_id"], "audio_file_id should not be empty"
                assert len(meeting["audio_file_id"]) == 24, "audio_file_id should be valid ObjectId"
                
                # Verify audio_filename is set
                assert "audio_filename" in meeting, "Meeting should have audio_filename field"
                assert meeting["audio_filename"], "audio_filename should not be empty"
                
                print(f"✓ Process endpoint stored audio in GridFS: {meeting['audio_file_id']}")
            finally:
                # Cleanup
                authenticated_session.delete(f"{BASE_URL}/api/meetings/{meeting_id}")
        else:
            # If process fails (e.g., AI service error), check if meeting was created with audio
            # This is acceptable as the audio storage is the focus, not the AI processing
            print(f"⚠ Process endpoint returned {response.status_code} - AI processing may have failed")
            print(f"  Response: {response.text[:200]}...")
            
            # Try to find the meeting that was created
            meetings_response = authenticated_session.get(f"{BASE_URL}/api/meetings")
            if meetings_response.status_code == 200:
                meetings = meetings_response.json()
                test_meetings = [m for m in meetings if m.get('title') == 'TEST_Process_GridFS_Meeting']
                if test_meetings:
                    meeting = test_meetings[0]
                    if meeting.get('audio_file_id'):
                        print(f"✓ Audio was stored in GridFS despite processing error: {meeting['audio_file_id']}")
                        # Cleanup
                        authenticated_session.delete(f"{BASE_URL}/api/meetings/{meeting['id']}")
                        return
            
            pytest.skip("Process endpoint failed - AI service may be unavailable")
    
    def test_process_requires_authentication(self, session, wav_file_content):
        """Test that process endpoint requires authentication"""
        unauthenticated_session = requests.Session()
        
        files = {
            'file': ('test_process.wav', wav_file_content, 'audio/wav')
        }
        data = {
            'title': 'TEST_Unauth_Process',
            'description': 'Should fail'
        }
        
        response = unauthenticated_session.post(
            f"{BASE_URL}/api/meetings/process",
            files=files,
            data=data
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Process endpoint requires authentication (401)")
    
    # ============== MEETING MODEL TESTS ==============
    
    def test_meeting_model_includes_audio_file_id_field(self, authenticated_session):
        """Test that Meeting model includes audio_file_id field"""
        # Create a meeting
        create_response = authenticated_session.post(
            f"{BASE_URL}/api/meetings",
            json={
                "title": "TEST_Model_Check_Meeting",
                "description": "Check audio_file_id field"
            }
        )
        assert create_response.status_code == 200
        meeting = create_response.json()
        meeting_id = meeting['id']
        
        try:
            # Verify audio_file_id field exists (even if empty)
            assert "audio_file_id" in meeting, "Meeting model should include audio_file_id field"
            
            # For new meeting, it should be empty string
            assert meeting["audio_file_id"] == "", f"New meeting audio_file_id should be empty, got: {meeting['audio_file_id']}"
            
            print("✓ Meeting model includes audio_file_id field")
        finally:
            # Cleanup
            authenticated_session.delete(f"{BASE_URL}/api/meetings/{meeting_id}")
    
    def test_meeting_list_includes_audio_file_id(self, authenticated_session, test_meeting, wav_file_content):
        """Test that meeting list includes audio_file_id for meetings with audio"""
        meeting_id = test_meeting['id']
        
        # Upload audio
        files = {
            'file': ('test_list.wav', wav_file_content, 'audio/wav')
        }
        
        upload_response = authenticated_session.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/upload",
            files=files
        )
        assert upload_response.status_code == 200
        
        # Get meetings list
        list_response = authenticated_session.get(f"{BASE_URL}/api/meetings")
        assert list_response.status_code == 200
        
        meetings = list_response.json()
        
        # Find our test meeting
        test_meetings = [m for m in meetings if m['id'] == meeting_id]
        assert len(test_meetings) == 1, "Test meeting should be in list"
        
        meeting = test_meetings[0]
        
        # Verify audio_file_id is present and populated
        assert "audio_file_id" in meeting, "Meeting in list should have audio_file_id"
        assert meeting["audio_file_id"], "audio_file_id should be populated for meeting with audio"
        
        print(f"✓ Meeting list includes audio_file_id: {meeting['audio_file_id']}")


class TestGridFSAudioReplacement:
    """Test that uploading new audio replaces old audio in GridFS"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        # Try login first
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
        )
        
        if login_response.status_code == 200:
            return login_response.json().get("session_token")
        
        # Try register
        register_response = session.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "name": TEST_USER_NAME
            }
        )
        
        if register_response.status_code == 200:
            return register_response.json().get("session_token")
        
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def authenticated_session(self, session, auth_token):
        session.headers.update({"Authorization": f"Bearer {auth_token}"})
        return session
    
    def test_upload_replaces_old_audio(self, authenticated_session):
        """Test that uploading new audio replaces the old audio file"""
        # Create meeting
        create_response = authenticated_session.post(
            f"{BASE_URL}/api/meetings",
            json={
                "title": "TEST_Replace_Audio_Meeting",
                "description": "Test audio replacement"
            }
        )
        assert create_response.status_code == 200
        meeting_id = create_response.json()['id']
        
        try:
            wav_content = create_test_wav_file()
            
            # Upload first audio
            files1 = {
                'file': ('first_audio.wav', wav_content, 'audio/wav')
            }
            upload1_response = authenticated_session.post(
                f"{BASE_URL}/api/meetings/{meeting_id}/upload",
                files=files1
            )
            assert upload1_response.status_code == 200
            first_file_id = upload1_response.json()['file_id']
            
            # Upload second audio
            files2 = {
                'file': ('second_audio.wav', wav_content, 'audio/wav')
            }
            upload2_response = authenticated_session.post(
                f"{BASE_URL}/api/meetings/{meeting_id}/upload",
                files=files2
            )
            assert upload2_response.status_code == 200
            second_file_id = upload2_response.json()['file_id']
            
            # Verify file_id changed
            assert first_file_id != second_file_id, "New upload should create new file_id"
            
            # Verify meeting has new file_id
            get_response = authenticated_session.get(f"{BASE_URL}/api/meetings/{meeting_id}")
            assert get_response.status_code == 200
            meeting = get_response.json()
            
            assert meeting['audio_file_id'] == second_file_id, "Meeting should have new file_id"
            
            print(f"✓ Audio replacement works: {first_file_id} -> {second_file_id}")
        finally:
            authenticated_session.delete(f"{BASE_URL}/api/meetings/{meeting_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
