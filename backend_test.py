#!/usr/bin/env python3
"""
Backend API Testing for Summary AI App
Tests all API endpoints for meeting management, transcription, and summarization
"""

import requests
import sys
import json
import time
from datetime import datetime
from pathlib import Path

class SummaryAITester:
    def __init__(self, base_url="https://briefnote.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

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

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
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

    def test_stats_endpoint(self):
        """Test stats endpoint"""
        return self.run_test(
            "Stats Endpoint",
            "GET", 
            "api/stats",
            200
        )

    def test_create_meeting(self):
        """Test creating a meeting"""
        meeting_data = {
            "title": f"Test Meeting {datetime.now().strftime('%H%M%S')}",
            "description": "This is a test meeting for API validation",
            "attendees": ["test@example.com", "user@example.com"]
        }
        
        success, response = self.run_test(
            "Create Meeting",
            "POST",
            "api/meetings",
            200,
            data=meeting_data
        )
        
        if success and response:
            return response.get('id')
        return None

    def test_get_meetings(self):
        """Test getting meetings list"""
        return self.run_test(
            "Get Meetings List",
            "GET",
            "api/meetings",
            200
        )

    def test_get_meeting_by_id(self, meeting_id):
        """Test getting a specific meeting"""
        if not meeting_id:
            self.log_test("Get Meeting by ID", False, "No meeting ID provided")
            return False
            
        return self.run_test(
            "Get Meeting by ID",
            "GET",
            f"api/meetings/{meeting_id}",
            200
        )

    def test_update_meeting(self, meeting_id):
        """Test updating a meeting"""
        if not meeting_id:
            self.log_test("Update Meeting", False, "No meeting ID provided")
            return False
            
        update_data = {
            "title": f"Updated Test Meeting {datetime.now().strftime('%H%M%S')}",
            "description": "Updated description for test meeting"
        }
        
        return self.run_test(
            "Update Meeting",
            "PUT",
            f"api/meetings/{meeting_id}",
            200,
            data=update_data
        )

    def test_upload_audio(self, meeting_id):
        """Test uploading audio file to meeting"""
        if not meeting_id:
            self.log_test("Upload Audio", False, "No meeting ID provided")
            return False
            
        # Create a small test audio file (mock)
        test_audio_content = b"fake audio content for testing"
        
        files = {
            'file': ('test_audio.wav', test_audio_content, 'audio/wav')
        }
        
        return self.run_test(
            "Upload Audio File",
            "POST",
            f"api/meetings/{meeting_id}/upload",
            200,
            files=files
        )

    def test_process_meeting_endpoint(self):
        """Test the process meeting endpoint (upload + transcribe + summarize)"""
        # Create a small test audio file
        test_audio_content = b"fake audio content for testing"
        
        files = {
            'file': ('test_meeting.wav', test_audio_content, 'audio/wav')
        }
        
        data = {
            'title': f'Processed Test Meeting {datetime.now().strftime("%H%M%S")}',
            'description': 'Test meeting processed via API'
        }
        
        success, response = self.run_test(
            "Process Meeting (Upload + Transcribe + Summarize)",
            "POST",
            "api/meetings/process",
            200,
            data=data,
            files=files
        )
        
        if success and response:
            return response.get('id')
        return None

    def test_delete_meeting(self, meeting_id):
        """Test deleting a meeting"""
        if not meeting_id:
            self.log_test("Delete Meeting", False, "No meeting ID provided")
            return False
            
        return self.run_test(
            "Delete Meeting",
            "DELETE",
            f"api/meetings/{meeting_id}",
            200
        )

    def test_subscription_plans(self):
        """Test getting subscription plans"""
        success, response = self.run_test(
            "Get Subscription Plans",
            "GET",
            "api/subscription/plans",
            200
        )
        
        if success and response:
            plans = response.get('plans', [])
            if len(plans) >= 2:
                # Check for monthly and yearly plans
                monthly_plan = next((p for p in plans if p.get('id') == 'monthly'), None)
                yearly_plan = next((p for p in plans if p.get('id') == 'yearly'), None)
                
                if monthly_plan and yearly_plan:
                    # Validate monthly plan
                    if monthly_plan.get('price') == 9.99 and monthly_plan.get('interval') == 'month':
                        print(f"   ✅ Monthly plan: ${monthly_plan.get('price')}/month")
                    else:
                        print(f"   ❌ Monthly plan price/interval incorrect")
                        
                    # Validate yearly plan  
                    if yearly_plan.get('price') == 79.99 and yearly_plan.get('interval') == 'year':
                        print(f"   ✅ Yearly plan: ${yearly_plan.get('price')}/year")
                    else:
                        print(f"   ❌ Yearly plan price/interval incorrect")
                else:
                    print(f"   ❌ Missing monthly or yearly plan")
            else:
                print(f"   ❌ Expected at least 2 plans, got {len(plans)}")
        
        return success

    def test_subscription_checkout(self):
        """Test creating subscription checkout session"""
        checkout_data = {
            "plan_id": "monthly",
            "origin_url": "https://briefnote.preview.emergentagent.com"
        }
        
        success, response = self.run_test(
            "Create Subscription Checkout",
            "POST",
            "api/subscription/checkout",
            200,
            data=checkout_data
        )
        
        if success and response:
            if 'checkout_url' in response and 'session_id' in response:
                print(f"   ✅ Checkout URL generated: {response.get('checkout_url')[:50]}...")
                return response.get('session_id')
            else:
                print(f"   ❌ Missing checkout_url or session_id in response")
        
        return None

    def test_subscription_status(self, session_id):
        """Test getting subscription status"""
        if not session_id:
            self.log_test("Get Subscription Status", False, "No session ID provided")
            return False
            
        return self.run_test(
            "Get Subscription Status",
            "GET",
            f"api/subscription/status/{session_id}",
            200
        )

    def test_subscription_transactions(self):
        """Test getting payment transactions"""
        return self.run_test(
            "Get Payment Transactions",
            "GET",
            "api/subscription/transactions",
            200
        )

    def run_all_tests(self):
        """Run comprehensive API tests"""
        print("🚀 Starting Summary AI Backend API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test basic endpoints
        self.test_root_endpoint()
        self.test_stats_endpoint()
        
        # Test meeting CRUD operations
        meeting_id = self.test_create_meeting()
        self.test_get_meetings()
        
        if meeting_id:
            self.test_get_meeting_by_id(meeting_id)
            self.test_update_meeting(meeting_id)
            self.test_upload_audio(meeting_id)
            # Clean up - delete the test meeting
            self.test_delete_meeting(meeting_id)
        
        # Test process meeting endpoint
        processed_meeting_id = self.test_process_meeting_endpoint()
        if processed_meeting_id:
            # Clean up processed meeting
            self.test_delete_meeting(processed_meeting_id)
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = SummaryAITester()
    
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