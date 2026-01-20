"""
Test Suite for Subscription, Promo Code, and Referral Features
Iteration 5 - Summary Boss App
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_USER_EMAIL = f"test_sub_{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_PASSWORD = "test123456"
TEST_USER_NAME = "Test Subscription User"

# Referral test user
REFERRER_EMAIL = f"referrer_{uuid.uuid4().hex[:8]}@example.com"
REFERRER_PASSWORD = "test123456"
REFERRER_NAME = "Referrer User"


class TestSubscriptionPlans:
    """Test subscription plans endpoint"""
    
    def test_get_subscription_plans(self):
        """GET /api/subscription/plans returns weekly ($7) and yearly ($78) plans"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plans" in data, "Response should contain 'plans' key"
        
        plans = data["plans"]
        assert len(plans) == 2, f"Expected 2 plans, got {len(plans)}"
        
        # Check weekly plan
        weekly_plan = next((p for p in plans if p["id"] == "weekly"), None)
        assert weekly_plan is not None, "Weekly plan not found"
        assert weekly_plan["price"] == 7.00, f"Weekly price should be $7, got {weekly_plan['price']}"
        assert weekly_plan["interval"] == "week", f"Weekly interval should be 'week', got {weekly_plan['interval']}"
        assert weekly_plan["trial_days"] == 3, f"Weekly trial_days should be 3, got {weekly_plan.get('trial_days')}"
        
        # Check yearly plan
        yearly_plan = next((p for p in plans if p["id"] == "yearly"), None)
        assert yearly_plan is not None, "Yearly plan not found"
        assert yearly_plan["price"] == 78.00, f"Yearly price should be $78, got {yearly_plan['price']}"
        assert yearly_plan["interval"] == "year", f"Yearly interval should be 'year', got {yearly_plan['interval']}"
        assert yearly_plan["trial_days"] == 3, f"Yearly trial_days should be 3, got {yearly_plan.get('trial_days')}"
        
        print("✓ Subscription plans endpoint returns correct weekly ($7) and yearly ($78) plans")


class TestPromoCode:
    """Test promo code functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test user for promo code tests"""
        self.session = requests.Session()
        self.email = f"promo_test_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register user
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.email,
            "password": TEST_USER_PASSWORD,
            "name": "Promo Test User"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        self.user_data = response.json()
        self.session.headers.update({"Authorization": f"Bearer {self.user_data['session_token']}"})
        yield
        # Cleanup handled by test database
    
    def test_apply_promo_code_gillian_lowercase(self):
        """POST /api/promo/apply with code 'gillian' grants lifetime access"""
        response = self.session.post(f"{BASE_URL}/api/promo/apply", json={"code": "gillian"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["subscription_status"] == "lifetime", f"Expected lifetime status, got {data.get('subscription_status')}"
        assert "lifetime" in data["message"].lower() or "success" in data["message"].lower()
        print("✓ Promo code 'gillian' (lowercase) grants lifetime access")
    
    def test_apply_promo_code_gillian_uppercase(self):
        """POST /api/promo/apply with code 'GILLIAN' grants lifetime access"""
        # Create new user for this test
        session = requests.Session()
        email = f"promo_upper_{uuid.uuid4().hex[:8]}@example.com"
        
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": "Promo Upper Test"
        })
        assert response.status_code == 200
        token = response.json()["session_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.post(f"{BASE_URL}/api/promo/apply", json={"code": "GILLIAN"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["subscription_status"] == "lifetime"
        print("✓ Promo code 'GILLIAN' (uppercase) grants lifetime access")
    
    def test_apply_promo_code_gillian_mixed_case(self):
        """POST /api/promo/apply with code 'Gillian' grants lifetime access"""
        # Create new user for this test
        session = requests.Session()
        email = f"promo_mixed_{uuid.uuid4().hex[:8]}@example.com"
        
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": "Promo Mixed Test"
        })
        assert response.status_code == 200
        token = response.json()["session_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.post(f"{BASE_URL}/api/promo/apply", json={"code": "Gillian"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["subscription_status"] == "lifetime"
        print("✓ Promo code 'Gillian' (mixed case) grants lifetime access")
    
    def test_apply_invalid_promo_code(self):
        """POST /api/promo/apply rejects invalid promo codes"""
        # Create new user for this test
        session = requests.Session()
        email = f"promo_invalid_{uuid.uuid4().hex[:8]}@example.com"
        
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": "Promo Invalid Test"
        })
        assert response.status_code == 200
        token = response.json()["session_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.post(f"{BASE_URL}/api/promo/apply", json={"code": "INVALIDCODE123"})
        assert response.status_code == 400, f"Expected 400 for invalid code, got {response.status_code}"
        
        data = response.json()
        assert "invalid" in data.get("detail", "").lower() or "promo" in data.get("detail", "").lower()
        print("✓ Invalid promo code is properly rejected with 400 status")
    
    def test_promo_code_requires_auth(self):
        """POST /api/promo/apply requires authentication"""
        response = requests.post(f"{BASE_URL}/api/promo/apply", json={"code": "Gillian"})
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Promo code endpoint requires authentication")


class TestReferralSystem:
    """Test referral system functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a referrer user"""
        self.referrer_session = requests.Session()
        self.referrer_email = f"referrer_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register referrer
        response = self.referrer_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.referrer_email,
            "password": REFERRER_PASSWORD,
            "name": REFERRER_NAME
        })
        assert response.status_code == 200, f"Referrer registration failed: {response.text}"
        self.referrer_data = response.json()
        self.referrer_session.headers.update({"Authorization": f"Bearer {self.referrer_data['session_token']}"})
        yield
    
    def test_user_gets_referral_code_on_registration(self):
        """New users get a unique referral code on registration"""
        # Get referral info
        response = self.referrer_session.get(f"{BASE_URL}/api/referrals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "referral_code" in data, "Response should contain referral_code"
        assert data["referral_code"] is not None, "Referral code should not be None"
        assert len(data["referral_code"]) > 0, "Referral code should not be empty"
        assert data["referral_code"].startswith("REF"), f"Referral code should start with 'REF', got {data['referral_code']}"
        print(f"✓ User gets referral code on registration: {data['referral_code']}")
    
    def test_get_referrals_returns_earnings_info(self):
        """GET /api/referrals returns user's referral code and earnings"""
        response = self.referrer_session.get(f"{BASE_URL}/api/referrals")
        assert response.status_code == 200
        
        data = response.json()
        assert "referral_code" in data
        assert "total_earnings" in data
        assert "referrals" in data
        assert "referral_reward" in data
        assert data["referral_reward"] == 50.0, f"Referral reward should be $50, got {data['referral_reward']}"
        assert "referral_condition" in data
        print("✓ GET /api/referrals returns referral code, earnings, and reward info")
    
    def test_validate_referral_code_valid(self):
        """GET /api/referrals/validate/{code} validates valid referral codes"""
        # Get referrer's code
        response = self.referrer_session.get(f"{BASE_URL}/api/referrals")
        referral_code = response.json()["referral_code"]
        
        # Validate the code (no auth required)
        response = requests.get(f"{BASE_URL}/api/referrals/validate/{referral_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["valid"] == True, "Valid referral code should return valid=True"
        assert "referrer_name" in data, "Response should contain referrer_name"
        print(f"✓ Valid referral code validation works, referrer: {data['referrer_name']}")
    
    def test_validate_referral_code_invalid(self):
        """GET /api/referrals/validate/{code} rejects invalid referral codes"""
        response = requests.get(f"{BASE_URL}/api/referrals/validate/INVALIDCODE123")
        assert response.status_code == 404, f"Expected 404 for invalid code, got {response.status_code}"
        print("✓ Invalid referral code returns 404")
    
    def test_register_with_referral_code(self):
        """POST /api/auth/register accepts optional referral_code parameter"""
        # Get referrer's code
        response = self.referrer_session.get(f"{BASE_URL}/api/referrals")
        referral_code = response.json()["referral_code"]
        
        # Register new user with referral code
        referred_email = f"referred_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": referred_email,
            "password": TEST_USER_PASSWORD,
            "name": "Referred User",
            "referral_code": referral_code
        })
        assert response.status_code == 200, f"Registration with referral failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert data["email"] == referred_email
        print(f"✓ Registration with referral code works, user: {data['user_id']}")
    
    def test_referrals_requires_auth(self):
        """GET /api/referrals requires authentication"""
        response = requests.get(f"{BASE_URL}/api/referrals")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Referrals endpoint requires authentication")


class TestSubscriptionStatus:
    """Test subscription status endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test user"""
        self.session = requests.Session()
        self.email = f"status_test_{uuid.uuid4().hex[:8]}@example.com"
        
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.email,
            "password": TEST_USER_PASSWORD,
            "name": "Status Test User"
        })
        assert response.status_code == 200
        self.user_data = response.json()
        self.session.headers.update({"Authorization": f"Bearer {self.user_data['session_token']}"})
        yield
    
    def test_get_subscription_status_new_user(self):
        """GET /api/subscription/status returns status for new user (no subscription)"""
        response = self.session.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "has_access" in data
        assert "status" in data
        assert "referral_code" in data
        assert "referral_earnings" in data
        # New user should have no access
        assert data["status"] in ["none", "trial"], f"New user status should be 'none' or 'trial', got {data['status']}"
        print(f"✓ Subscription status for new user: {data['status']}")
    
    def test_subscription_status_requires_auth(self):
        """GET /api/subscription/status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Subscription status endpoint requires authentication")
    
    def test_subscription_status_after_promo(self):
        """GET /api/subscription/status returns lifetime after promo code"""
        # Apply promo code
        response = self.session.post(f"{BASE_URL}/api/promo/apply", json={"code": "Gillian"})
        assert response.status_code == 200
        
        # Check status
        response = self.session.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "lifetime", f"Expected lifetime status, got {data['status']}"
        assert data["has_access"] == True, "Should have access with lifetime status"
        print("✓ Subscription status shows 'lifetime' after promo code applied")


class TestSubscriptionCheckout:
    """Test subscription checkout endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test user"""
        self.session = requests.Session()
        self.email = f"checkout_test_{uuid.uuid4().hex[:8]}@example.com"
        
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.email,
            "password": TEST_USER_PASSWORD,
            "name": "Checkout Test User"
        })
        assert response.status_code == 200
        self.user_data = response.json()
        self.session.headers.update({"Authorization": f"Bearer {self.user_data['session_token']}"})
        yield
    
    def test_create_checkout_session_weekly(self):
        """POST /api/subscription/checkout creates Stripe checkout session for weekly plan"""
        response = self.session.post(f"{BASE_URL}/api/subscription/checkout", json={
            "plan_id": "weekly",
            "origin_url": "https://example.com"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "checkout_url" in data, "Response should contain checkout_url"
        assert "session_id" in data, "Response should contain session_id"
        assert "trial_days" in data, "Response should contain trial_days"
        assert data["trial_days"] == 3, f"Trial days should be 3, got {data['trial_days']}"
        assert "stripe.com" in data["checkout_url"], "Checkout URL should be Stripe URL"
        print(f"✓ Weekly checkout session created with {data['trial_days']}-day trial")
    
    def test_create_checkout_session_yearly(self):
        """POST /api/subscription/checkout creates Stripe checkout session for yearly plan"""
        # Create new user for yearly test
        session = requests.Session()
        email = f"checkout_yearly_{uuid.uuid4().hex[:8]}@example.com"
        
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": "Checkout Yearly Test"
        })
        assert response.status_code == 200
        token = response.json()["session_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.post(f"{BASE_URL}/api/subscription/checkout", json={
            "plan_id": "yearly",
            "origin_url": "https://example.com"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "checkout_url" in data
        assert "session_id" in data
        assert data["trial_days"] == 3
        print(f"✓ Yearly checkout session created with {data['trial_days']}-day trial")
    
    def test_checkout_invalid_plan(self):
        """POST /api/subscription/checkout rejects invalid plan_id"""
        response = self.session.post(f"{BASE_URL}/api/subscription/checkout", json={
            "plan_id": "invalid_plan",
            "origin_url": "https://example.com"
        })
        assert response.status_code == 400, f"Expected 400 for invalid plan, got {response.status_code}"
        print("✓ Invalid plan_id is rejected with 400 status")
    
    def test_checkout_requires_auth(self):
        """POST /api/subscription/checkout requires authentication"""
        response = requests.post(f"{BASE_URL}/api/subscription/checkout", json={
            "plan_id": "weekly",
            "origin_url": "https://example.com"
        })
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Checkout endpoint requires authentication")


class TestLoginErrorHandling:
    """Test login error handling for frontend toast"""
    
    def test_login_invalid_credentials_returns_error(self):
        """POST /api/auth/login returns proper error for invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Error response should contain 'detail'"
        assert len(data["detail"]) > 0, "Error message should not be empty"
        print(f"✓ Login error returns proper message: {data['detail']}")
    
    def test_login_wrong_password_returns_error(self):
        """POST /api/auth/login returns error for wrong password"""
        # First register a user
        email = f"login_test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "correctpassword",
            "name": "Login Test User"
        })
        assert response.status_code == 200
        
        # Try to login with wrong password
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"✓ Wrong password returns proper error: {data['detail']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
