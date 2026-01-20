#!/usr/bin/env python3
"""
Backend API Testing for Summary Boss App - Authentication Focus
Tests authentication endpoints and protected routes
"""

import requests
import sys
import json
import time
from datetime import datetime
from pathlib import Path

class SummaryBossAuthTester:
    def __init__(self, base_url="https://briefnote.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.session_token = None
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@example.com"
        self.test_user_password = "TestPass123!"
        self.test_user_name = "Test User"

    def log_test(self, name, success, details="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, use_auth=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        # Add authentication if required
        if use_auth and self.session_token:
            headers['Authorization'] = f'Bearer {self.session_token}'
        
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if use_auth:
            print(f"   Auth: {'Yes' if self.session_token else 'No token available'}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers, timeout=60)
                else:
                    headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=headers, timeout=60)
            elif method == 'PUT':
                headers['Content-Type'] = 'application/json'
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
                if success:
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
            except:
                if success:
                    print(f"   Response: {response.text[:200]}...")

            if success:
                self.log_test(name, True, response_data=response_data)
            else:
                error_detail = f"Expected {expected_status}, got {response.status_code}"
                if response.text:
                    error_detail += f" - {response.text[:200]}"
                self.log_test(name, False, error_detail)

            return success, response_data

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"   Error: {error_msg}")
            self.log_test(name, False, error_msg)
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "api/",
            200
        )

    def test_register_user(self):
        """Test user registration with email/password"""
        register_data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "name": self.test_user_name
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data=register_data
        )
        
        if success and response:
            # Store session token for future tests
            self.session_token = response.get('session_token')
            if self.session_token:
                print(f"   ✅ Session token received: {self.session_token[:20]}...")
            
            # Validate response structure
            required_fields = ['user_id', 'email', 'name', 'session_token']
            for field in required_fields:
                if field not in response:
                    print(f"   ❌ Missing field in response: {field}")
                    return False
                    
            if response.get('email') == self.test_user_email:
                print(f"   ✅ Email matches: {response.get('email')}")
            else:
                print(f"   ❌ Email mismatch: expected {self.test_user_email}, got {response.get('email')}")
                
        return success

    def test_login_user(self):
        """Test user login with email/password"""
        login_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )
        
        if success and response:
            # Update session token
            new_token = response.get('session_token')
            if new_token:
                self.session_token = new_token
                print(f"   ✅ New session token received: {new_token[:20]}...")
            
            # Validate response structure
            required_fields = ['user_id', 'email', 'name', 'session_token']
            for field in required_fields:
                if field not in response:
                    print(f"   ❌ Missing field in response: {field}")
                    return False
                    
        return success

    def test_get_current_user(self):
        """Test getting current authenticated user"""
        if not self.session_token:
            self.log_test("Get Current User", False, "No session token available")
            return False
            
        success, response = self.run_test(
            "Get Current User (/api/auth/me)",
            "GET",
            "api/auth/me",
            200,
            use_auth=True
        )
        
        if success and response:
            # Validate user data
            if response.get('email') == self.test_user_email:
                print(f"   ✅ User email matches: {response.get('email')}")
            else:
                print(f"   ❌ User email mismatch")
                
            if 'user_id' in response and 'name' in response:
                print(f"   ✅ User data complete: {response.get('name')}")
            else:
                print(f"   ❌ Missing user data fields")
                
        return success

    def test_meetings_requires_auth(self):
        """Test that meetings endpoint requires authentication"""
        # First test without authentication - should return 401
        success_unauth, _ = self.run_test(
            "Meetings Endpoint (Unauthenticated)",
            "GET",
            "api/meetings",
            401,
            use_auth=False
        )
        
        if not success_unauth:
            print(f"   ❌ Expected 401 for unauthenticated request")
            return False
            
        # Then test with authentication - should return 200
        if not self.session_token:
            print(f"   ❌ No session token for authenticated test")
            return False
            
        success_auth, response = self.run_test(
            "Meetings Endpoint (Authenticated)",
            "GET",
            "api/meetings",
            200,
            use_auth=True
        )
        
        if success_auth:
            print(f"   ✅ Authenticated request successful")
            if isinstance(response, list):
                print(f"   ✅ Response is list of meetings: {len(response)} meetings")
            else:
                print(f"   ❌ Response is not a list")
                return False
        
        return success_unauth and success_auth

    def test_create_meeting_authenticated(self):
        """Test creating a meeting with authentication"""
        if not self.session_token:
            self.log_test("Create Meeting (Authenticated)", False, "No session token available")
            return False
            
        meeting_data = {
            "title": f"Test Meeting {datetime.now().strftime('%H%M%S')}",
            "description": "This is a test meeting for auth validation",
            "attendees": ["test@example.com"]
        }
        
        success, response = self.run_test(
            "Create Meeting (Authenticated)",
            "POST",
            "api/meetings",
            200,
            data=meeting_data,
            use_auth=True
        )
        
        if success and response:
            meeting_id = response.get('id')
            if meeting_id:
                print(f"   ✅ Meeting created with ID: {meeting_id}")
                return meeting_id
            else:
                print(f"   ❌ No meeting ID in response")
        
        return None if not success else response.get('id')

    def test_logout_user(self):
        """Test user logout"""
        if not self.session_token:
            self.log_test("User Logout", False, "No session token available")
            return False
            
        success, response = self.run_test(
            "User Logout",
            "POST",
            "api/auth/logout",
            200,
            use_auth=True
        )
        
        if success:
            # Clear session token
            self.session_token = None
            print(f"   ✅ Session token cleared")
            
            # Verify logout by trying to access protected endpoint
            success_verify, _ = self.run_test(
                "Verify Logout (Should be 401)",
                "GET",
                "api/auth/me",
                401,
                use_auth=False
            )
            
            if success_verify:
                print(f"   ✅ Logout verified - protected endpoint returns 401")
            else:
                print(f"   ❌ Logout verification failed")
                return False
        
        return success

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_login_data = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        success, response = self.run_test(
            "Invalid Login (Should be 401)",
            "POST",
            "api/auth/login",
            401,
            data=invalid_login_data
        )
        
        return success

    def test_duplicate_registration(self):
        """Test registering with existing email"""
        duplicate_data = {
            "email": self.test_user_email,  # Same email as before
            "password": "AnotherPass123!",
            "name": "Another User"
        }
        
        success, response = self.run_test(
            "Duplicate Registration (Should be 400)",
            "POST",
            "api/auth/register",
            400,
            data=duplicate_data
        )
        
        return success

    def test_forgot_password(self):
        """Test forgot password endpoint"""
        forgot_data = {
            "email": self.test_user_email
        }
        
        success, response = self.run_test(
            "Forgot Password Request",
            "POST",
            "api/auth/forgot-password",
            200,
            data=forgot_data
        )
        
        if success and response:
            # Check response structure
            if 'message' in response:
                print(f"   ✅ Message received: {response.get('message')}")
            
            # In test mode, should return reset_token
            reset_token = response.get('reset_token')
            if reset_token:
                print(f"   ✅ Reset token received: {reset_token[:20]}...")
                return reset_token
            else:
                print(f"   ⚠️  No reset token in response (may be production mode)")
                return True  # Still success if message is present
        
        return None

    def test_reset_password(self, reset_token):
        """Test reset password with token"""
        if not reset_token:
            self.log_test("Reset Password", False, "No reset token available")
            return False
            
        new_password = "NewTestPass123!"
        reset_data = {
            "token": reset_token,
            "new_password": new_password
        }
        
        success, response = self.run_test(
            "Reset Password with Token",
            "POST",
            "api/auth/reset-password",
            200,
            data=reset_data
        )
        
        if success:
            # Update our test password for future logins
            self.test_user_password = new_password
            print(f"   ✅ Password updated for future tests")
        
        return success

    def test_update_profile(self):
        """Test updating user profile"""
        if not self.session_token:
            self.log_test("Update Profile", False, "No session token available")
            return False
            
        new_name = f"Updated {self.test_user_name}"
        profile_data = {
            "name": new_name,
            "picture": "https://example.com/avatar.jpg"
        }
        
        success, response = self.run_test(
            "Update User Profile",
            "PUT",
            "api/auth/profile",
            200,
            data=profile_data,
            use_auth=True
        )
        
        if success and response:
            # Validate updated data
            if response.get('name') == new_name:
                print(f"   ✅ Name updated successfully: {response.get('name')}")
            else:
                print(f"   ❌ Name not updated correctly")
                return False
                
            if response.get('picture') == profile_data['picture']:
                print(f"   ✅ Picture updated successfully")
            else:
                print(f"   ❌ Picture not updated correctly")
        
        return success

    def test_change_password(self):
        """Test changing password for authenticated user"""
        if not self.session_token:
            self.log_test("Change Password", False, "No session token available")
            return False
            
        new_password = "ChangedTestPass123!"
        password_data = {
            "current_password": self.test_user_password,
            "new_password": new_password
        }
        
        success, response = self.run_test(
            "Change Password (Authenticated)",
            "POST",
            "api/auth/change-password",
            200,
            data=password_data,
            use_auth=True
        )
        
        if success:
            # Update our test password for future logins
            self.test_user_password = new_password
            print(f"   ✅ Password changed successfully")
            
            # Verify we can still login with new password
            login_data = {
                "email": self.test_user_email,
                "password": new_password
            }
            
            login_success, login_response = self.run_test(
                "Login with New Password",
                "POST",
                "api/auth/login",
                200,
                data=login_data
            )
            
            if login_success and login_response:
                self.session_token = login_response.get('session_token')
                print(f"   ✅ Login with new password successful")
            else:
                print(f"   ❌ Login with new password failed")
                return False
        
        return success

    def test_change_password_invalid_current(self):
        """Test changing password with invalid current password"""
        if not self.session_token:
            self.log_test("Change Password (Invalid Current)", False, "No session token available")
            return False
            
        password_data = {
            "current_password": "WrongCurrentPassword",
            "new_password": "NewPassword123!"
        }
        
        success, response = self.run_test(
            "Change Password (Invalid Current - Should be 400)",
            "POST",
            "api/auth/change-password",
            400,
            data=password_data,
            use_auth=True
        )
        
        return success

    def test_meeting_executive_summary(self):
        """Test that meeting model includes executive_summary field"""
        if not self.session_token:
            self.log_test("Meeting Executive Summary", False, "No session token available")
            return False
            
        # Create a test meeting
        meeting_data = {
            "title": f"Executive Summary Test Meeting {datetime.now().strftime('%H%M%S')}",
            "description": "Testing executive summary field",
            "attendees": ["exec@example.com"]
        }
        
        success, response = self.run_test(
            "Create Meeting (Check Executive Summary Field)",
            "POST",
            "api/meetings",
            200,
            data=meeting_data,
            use_auth=True
        )
        
        if success and response:
            meeting_id = response.get('id')
            
            # Check if executive_summary field exists in response
            if 'executive_summary' in response:
                print(f"   ✅ Executive summary field present: {response.get('executive_summary', 'null')}")
                
                # Clean up - delete the test meeting
                self.run_test(
                    "Delete Executive Summary Test Meeting",
                    "DELETE",
                    f"api/meetings/{meeting_id}",
                    200,
                    use_auth=True
                )
                
                return True
            else:
                print(f"   ❌ Executive summary field missing from meeting model")
                return False
        
        return False

    def run_all_tests(self):
        """Run comprehensive authentication API tests including new password reset and profile features"""
        print("🚀 Starting Summary Boss Authentication API Tests (Including Password Reset & Profile)")
        print(f"📍 Base URL: {self.base_url}")
        print(f"👤 Test User: {self.test_user_email}")
        print("=" * 60)
        
        # Test basic endpoint
        self.test_root_endpoint()
        
        # Test authentication flow
        print("\n🔐 Testing Authentication Flow:")
        
        # 1. Register new user
        self.test_register_user()
        
        # 2. Test getting current user (should work with registration token)
        self.test_get_current_user()
        
        # 3. Test protected endpoints require auth
        self.test_meetings_requires_auth()
        
        # 4. Test creating meeting with auth and executive summary field
        meeting_id = self.test_create_meeting_authenticated()
        self.test_meeting_executive_summary()
        
        # 5. Test profile management
        print("\n👤 Testing Profile Management:")
        self.test_update_profile()
        
        # 6. Test password management
        print("\n🔒 Testing Password Management:")
        self.test_change_password()
        self.test_change_password_invalid_current()
        
        # 7. Test logout
        self.test_logout_user()
        
        # 8. Test password reset flow
        print("\n🔄 Testing Password Reset Flow:")
        reset_token = self.test_forgot_password()
        if reset_token and reset_token != True:  # Only if we got actual token
            self.test_reset_password(reset_token)
        
        # 9. Test login after password reset (if reset was performed)
        self.test_login_user()
        
        # 10. Test getting current user after login
        self.test_get_current_user()
        
        # Test error cases
        print("\n❌ Testing Error Cases:")
        
        # 11. Test invalid login
        self.test_invalid_login()
        
        # 12. Test duplicate registration
        self.test_duplicate_registration()
        
        # Clean up - delete test meeting if created
        if meeting_id:
            # Re-login to get token for cleanup
            login_data = {
                "email": self.test_user_email,
                "password": self.test_user_password
            }
            success, response = self.run_test(
                "Re-login for Cleanup",
                "POST",
                "api/auth/login",
                200,
                data=login_data
            )
            if success and response:
                self.session_token = response.get('session_token')
                # Delete the test meeting
                self.run_test(
                    "Delete Test Meeting (Cleanup)",
                    "DELETE",
                    f"api/meetings/{meeting_id}",
                    200,
                    use_auth=True
                )
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Enhanced Authentication Test Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = SummaryBossAuthTester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed results
        results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
            "test_details": tester.test_results
        }
        
        results_file = Path("/app/test_reports/backend_api_results.json")
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: {results_file}")
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())