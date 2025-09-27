#!/usr/bin/env python
import requests
import json

def test_api_endpoints():
    base_url = "http://127.0.0.1:8000"
    
    # Test login
    session = requests.Session()
    
    # Get login page first to get CSRF token
    login_page = session.get(f"{base_url}/login/")
    csrf_token = session.cookies.get('csrftoken')
    
    # Login
    login_data = {
        'username': 'testuser',
        'password': 'password123',
        'csrfmiddlewaretoken': csrf_token
    }
    
    login_response = session.post(f"{base_url}/login/", data=login_data)
    print(f"Login status: {login_response.status_code}")
    
    # Test API endpoints
    endpoints = [
        '/api/tasks/',
        '/api/user/xp/',
        '/api/user/streak/',
        '/api/progress/',
        '/api/shield-data/',
        '/api/tasks/tree/',
    ]
    
    for endpoint in endpoints:
        try:
            response = session.get(f"{base_url}{endpoint}")
            print(f"{endpoint}: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"  Response keys: {list(data.keys())}")
        except Exception as e:
            print(f"{endpoint}: Error - {e}")
    
    # Test chatbot endpoint
    try:
        chatbot_data = {
            'message': 'Hello, how can you help me?',
            'csrfmiddlewaretoken': csrf_token
        }
        response = session.post(f"{base_url}/api/chatbot/", 
                              data=json.dumps(chatbot_data),
                              headers={'Content-Type': 'application/json'})
        print(f"/api/chatbot/: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Response: {data.get('response', 'No response')[:50]}...")
    except Exception as e:
        print(f"/api/chatbot/: Error - {e}")

if __name__ == '__main__':
    test_api_endpoints()
