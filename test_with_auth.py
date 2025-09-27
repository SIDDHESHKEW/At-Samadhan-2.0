#!/usr/bin/env python
import requests
import json

def test_with_authentication():
    base_url = "http://127.0.0.1:8000"
    
    # Create a session to maintain cookies
    session = requests.Session()
    
    # Step 1: Get login page to get CSRF token
    login_page = session.get(f"{base_url}/login/")
    csrf_token = session.cookies.get('csrftoken')
    print(f"CSRF Token: {csrf_token}")
    
    # Step 2: Login
    login_data = {
        'username': 'testuser',
        'password': 'password123',
        'csrfmiddlewaretoken': csrf_token
    }
    
    login_response = session.post(f"{base_url}/login/", data=login_data)
    print(f"Login status: {login_response.status_code}")
    
    # Step 3: Test API endpoints
    endpoints = [
        '/api/progress/',
        '/api/tasks/',
        '/api/user/xp/',
        '/api/user/streak/',
        '/api/shield-data/',
        '/api/tasks/tree/',
    ]
    
    for endpoint in endpoints:
        try:
            response = session.get(f"{base_url}{endpoint}")
            print(f"\n{endpoint}:")
            print(f"  Status: {response.status_code}")
            print(f"  Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"  JSON Response: {json.dumps(data, indent=2)[:200]}...")
                except:
                    print(f"  HTML Response (first 100 chars): {response.text[:100]}...")
            else:
                print(f"  Error Response: {response.text[:100]}...")
                
        except Exception as e:
            print(f"{endpoint}: Error - {e}")
    
    # Step 4: Test task toggle
    print(f"\nTesting task toggle:")
    try:
        # First get tasks to see what's available
        tasks_response = session.get(f"{base_url}/api/tasks/")
        if tasks_response.status_code == 200:
            tasks_data = tasks_response.json()
            if tasks_data.get('tasks') and len(tasks_data['tasks']) > 0:
                task_id = tasks_data['tasks'][0]['id']
                print(f"  Found task ID: {task_id}")
                
                # Test toggle
                toggle_response = session.post(f"{base_url}/api/tasks/toggle/{task_id}/", 
                                             headers={'Content-Type': 'application/json',
                                                     'X-CSRFToken': csrf_token})
                print(f"  Toggle status: {toggle_response.status_code}")
                if toggle_response.status_code == 200:
                    toggle_data = toggle_response.json()
                    print(f"  Toggle response: {json.dumps(toggle_data, indent=2)}")
                else:
                    print(f"  Toggle error: {toggle_response.text[:200]}...")
            else:
                print("  No tasks found")
        else:
            print(f"  Could not get tasks: {tasks_response.status_code}")
    except Exception as e:
        print(f"  Task toggle error: {e}")

if __name__ == '__main__':
    test_with_authentication()
