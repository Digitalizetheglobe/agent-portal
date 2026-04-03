#!/usr/bin/env python3
"""
Backend API Testing for Admin & Agent Management Portal
Tests all API endpoints with proper authentication and authorization
"""

import requests
import sys
import json
from datetime import datetime

class AdminPortalAPITester:
    def __init__(self, base_url="https://admin-control-hub-57.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.admin_token = None
        self.agent_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = self.session.get(f"{self.api_url}/health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("Health Check", False, f"Error: {str(e)}")
            return False

    def test_admin_login(self):
        """Test admin login"""
        try:
            login_data = {
                "email": "admin@example.com",
                "password": "admin123"
            }
            response = self.session.post(f"{self.api_url}/auth/login", json=login_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                user_data = response.json()
                success = user_data.get('role') == 'admin'
                details = f"Role: {user_data.get('role')}, Email: {user_data.get('email')}"
                # Store cookies for subsequent requests
                self.admin_token = True  # Using session cookies
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Admin Login", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Login", False, f"Error: {str(e)}")
            return False

    def test_agent_login(self):
        """Test agent login with new session"""
        try:
            # Create new session for agent
            agent_session = requests.Session()
            login_data = {
                "email": "john.smith@example.com",
                "password": "agent123"
            }
            response = agent_session.post(f"{self.api_url}/auth/login", json=login_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                user_data = response.json()
                success = user_data.get('role') == 'agent'
                details = f"Role: {user_data.get('role')}, Email: {user_data.get('email')}"
                self.agent_token = agent_session  # Store agent session
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Agent Login", success, details)
            return success
        except Exception as e:
            self.log_test("Agent Login", False, f"Error: {str(e)}")
            return False

    def test_get_me_admin(self):
        """Test /auth/me endpoint with admin session"""
        try:
            response = self.session.get(f"{self.api_url}/auth/me", timeout=10)
            success = response.status_code == 200
            
            if success:
                user_data = response.json()
                success = user_data.get('role') == 'admin'
                details = f"Role: {user_data.get('role')}, Name: {user_data.get('name')}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Get Me (Admin)", success, details)
            return success
        except Exception as e:
            self.log_test("Get Me (Admin)", False, f"Error: {str(e)}")
            return False

    def test_get_agents(self):
        """Test get all agents endpoint"""
        try:
            response = self.session.get(f"{self.api_url}/agents", timeout=10)
            success = response.status_code == 200
            
            if success:
                agents = response.json()
                success = isinstance(agents, list) and len(agents) >= 3
                details = f"Found {len(agents)} agents"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Get Agents", success, details)
            return success, agents if success else []
        except Exception as e:
            self.log_test("Get Agents", False, f"Error: {str(e)}")
            return False, []

    def test_get_events(self):
        """Test get all events endpoint"""
        try:
            response = self.session.get(f"{self.api_url}/events", timeout=10)
            success = response.status_code == 200
            
            if success:
                events = response.json()
                success = isinstance(events, list) and len(events) >= 3
                details = f"Found {len(events)} events"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Get Events", success, details)
            return success, events if success else []
        except Exception as e:
            self.log_test("Get Events", False, f"Error: {str(e)}")
            return False, []

    def test_get_students(self):
        """Test get all students endpoint"""
        try:
            response = self.session.get(f"{self.api_url}/students", timeout=10)
            success = response.status_code == 200
            
            if success:
                students = response.json()
                success = isinstance(students, list) and len(students) >= 3
                details = f"Found {len(students)} students"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Get Students", success, details)
            return success, students if success else []
        except Exception as e:
            self.log_test("Get Students", False, f"Error: {str(e)}")
            return False, []

    def test_get_stats(self):
        """Test get stats endpoint"""
        try:
            response = self.session.get(f"{self.api_url}/stats", timeout=10)
            success = response.status_code == 200
            
            if success:
                stats = response.json()
                required_fields = ['totalAgents', 'totalEvents', 'totalStudents']
                success = all(field in stats for field in required_fields)
                details = f"Stats: {stats}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Get Stats", success, details)
            return success
        except Exception as e:
            self.log_test("Get Stats", False, f"Error: {str(e)}")
            return False

    def test_create_agent(self):
        """Test creating a new agent (Admin only)"""
        try:
            agent_data = {
                "name": "Test Agent",
                "email": f"test.agent.{datetime.now().strftime('%H%M%S')}@example.com",
                "userId": f"test.agent.{datetime.now().strftime('%H%M%S')}",
                "password": "testpass123",
                "phone": "+1 555 123 4567",
                "status": "active"
            }
            
            response = self.session.post(f"{self.api_url}/agents", json=agent_data, timeout=10)
            success = response.status_code == 201
            
            if success:
                created_agent = response.json()
                details = f"Created agent: {created_agent.get('name')} ({created_agent.get('email')})"
                return success, created_agent.get('id')
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
                
            self.log_test("Create Agent", success, details)
            return success, None
        except Exception as e:
            self.log_test("Create Agent", False, f"Error: {str(e)}")
            return False, None

    def test_create_event(self, agent_ids):
        """Test creating a new event (Admin only)"""
        try:
            event_data = {
                "title": f"Test Event {datetime.now().strftime('%H%M%S')}",
                "description": "This is a test event created during API testing",
                "date": "2025-12-31",
                "assignedAgents": agent_ids[:2] if len(agent_ids) >= 2 else agent_ids
            }
            
            response = self.session.post(f"{self.api_url}/events", json=event_data, timeout=10)
            success = response.status_code == 201
            
            if success:
                created_event = response.json()
                details = f"Created event: {created_event.get('title')}"
                return success, created_event.get('id')
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
                
            self.log_test("Create Event", success, details)
            return success, None
        except Exception as e:
            self.log_test("Create Event", False, f"Error: {str(e)}")
            return False, None

    def test_agent_access_restrictions(self):
        """Test that agents can only access their assigned data"""
        if not self.agent_token:
            self.log_test("Agent Access Restrictions", False, "No agent session available")
            return False
            
        try:
            # Test agent can access events
            response = self.agent_token.get(f"{self.api_url}/events", timeout=10)
            events_success = response.status_code == 200
            
            # Test agent can access students
            response = self.agent_token.get(f"{self.api_url}/students", timeout=10)
            students_success = response.status_code == 200
            
            # Test agent cannot create agents (should fail)
            agent_data = {
                "name": "Unauthorized Agent",
                "email": "unauthorized@example.com",
                "userId": "unauthorized",
                "password": "test123"
            }
            response = self.agent_token.post(f"{self.api_url}/agents", json=agent_data, timeout=10)
            create_agent_blocked = response.status_code in [401, 403]
            
            success = events_success and students_success and create_agent_blocked
            details = f"Events: {events_success}, Students: {students_success}, Create blocked: {create_agent_blocked}"
            
            self.log_test("Agent Access Restrictions", success, details)
            return success
        except Exception as e:
            self.log_test("Agent Access Restrictions", False, f"Error: {str(e)}")
            return False

    def test_logout(self):
        """Test logout functionality"""
        try:
            response = self.session.post(f"{self.api_url}/auth/logout", timeout=10)
            success = response.status_code == 200
            
            # Test that subsequent requests fail
            me_response = self.session.get(f"{self.api_url}/auth/me", timeout=10)
            logout_effective = me_response.status_code == 401
            
            success = success and logout_effective
            details = f"Logout status: {response.status_code}, Auth cleared: {logout_effective}"
            
            self.log_test("Logout", success, details)
            return success
        except Exception as e:
            self.log_test("Logout", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run comprehensive API test suite"""
        print("🚀 Starting Admin Portal API Tests")
        print(f"📍 Testing API: {self.api_url}")
        print("=" * 50)

        # Basic connectivity
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return self.get_results()

        # Authentication tests
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return self.get_results()

        self.test_agent_login()
        self.test_get_me_admin()

        # Data retrieval tests
        agents_success, agents = self.test_get_agents()
        events_success, events = self.test_get_events()
        students_success, students = self.test_get_students()
        self.test_get_stats()

        # CRUD operations (Admin only)
        if agents_success:
            agent_ids = [agent.get('id') for agent in agents if agent.get('id')]
            create_agent_success, new_agent_id = self.test_create_agent()
            if new_agent_id:
                agent_ids.append(new_agent_id)
            
            if events_success and agent_ids:
                self.test_create_event(agent_ids)

        # Authorization tests
        self.test_agent_access_restrictions()

        # Cleanup
        self.test_logout()

        return self.get_results()

    def get_results(self):
        """Get test results summary"""
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": f"{success_rate:.1f}%",
            "test_details": self.test_results
        }

def main():
    """Main test execution"""
    tester = AdminPortalAPITester()
    results = tester.run_all_tests()
    
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    print(f"Total Tests: {results['total_tests']}")
    print(f"Passed: {results['passed_tests']}")
    print(f"Failed: {results['failed_tests']}")
    print(f"Success Rate: {results['success_rate']}")
    
    if results['failed_tests'] > 0:
        print("\n❌ FAILED TESTS:")
        for test in results['test_details']:
            if not test['success']:
                print(f"  - {test['test']}: {test['details']}")
    
    # Return appropriate exit code
    return 0 if results['failed_tests'] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())