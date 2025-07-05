import datetime
import jwt
import uuid
import smtplib
import pandas as pd
import io
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import jsonify, send_file
from bson.objectid import ObjectId
from bson.errors import InvalidId
import requests
import json

from config import (
    db, ADMIN_ROLE, VIEWER_ROLE, JWT_SECRET, GROQ_API_KEY, 
    SMTP_EMAIL, SMTP_PASSWORD, MASTER_EMAIL, SMTP_SERVER, SMTP_PORT,
    USER_STATUS_PENDING, USER_STATUS_APPROVED, USER_STATUS_REJECTED,
    RESOURCE_REQUIRED_FIELDS, CSV_COLUMN_MAPPING,
    USERS_COLLECTION, RESOURCES_COLLECTION, SESSIONS_COLLECTION, CHAT_HISTORY_COLLECTION
)
from firebase_admin import auth as firebase_auth
from utils import format_response, validate_email, get_user_from_token

# Check if Firebase is initialized
try:
    import firebase_admin
    firebase_initialized = firebase_admin._apps and len(firebase_admin._apps) > 0
except Exception:
    firebase_initialized = False

class AuthService:
    def register_user(self, data):
        """Register a new user with Firebase and MongoDB"""
        try:
            # Check if database is available - FIX THIS LINE
            if db is None:
                return format_response(error="Database connection not available", status=500)
            
            email = data.get('email')
            password = data.get('password')
            role = data.get('role', VIEWER_ROLE)
            
            # Validate email format
            if not validate_email(email):
                return format_response(error="Invalid email format", status=400)
            
            # Check if user already exists
            existing_user = db[USERS_COLLECTION].find_one({'email': email})
            if existing_user:
                return format_response(error="User already exists", status=409)
            
            # Create user with Firebase (or mock if Firebase not available)
            user_uid = None
            if firebase_initialized:
                try:
                    user_record = firebase_auth.create_user(
                        email=email,
                        password=password,
                        display_name=data.get('name', ''),
                        email_verified=False
                    )
                    user_uid = user_record.uid
                except Exception as e:
                    print(f"Firebase user creation failed: {e}")
                    # Use mock UID for testing
                    user_uid = f"mock_uid_{email.replace('@', '_').replace('.', '_')}"
            else:
                # Use mock UID for testing
                user_uid = f"mock_uid_{email.replace('@', '_').replace('.', '_')}"
            
            # Create user document in MongoDB
            user_doc = {
                'firebase_uid': user_uid,
                'email': email,
                'name': data.get('name', ''),
                'role': role,
                'status': USER_STATUS_PENDING if role == ADMIN_ROLE else USER_STATUS_APPROVED,
                'created_at': datetime.datetime.utcnow(),
                'last_login': None,
                'session_ids': []
            }
            
            db[USERS_COLLECTION].insert_one(user_doc)
            
            # Send admin verification email if admin role
            if role == ADMIN_ROLE:
                self.send_admin_verification_email(email, data.get('name', ''))
                message = 'Admin account created successfully. Pending approval from master admin.'
            else:
                message = 'User account created successfully.'
            
            return format_response(message=message, status=201)
            
        except Exception as e:
            print(f"Registration error details: {e}")
            return format_response(error=f"Registration failed: {str(e)}", status=400)

    
    def send_admin_verification_email(self, admin_email, admin_name):
        """Send verification email to master admin"""
        try:
            if not SMTP_EMAIL or not SMTP_PASSWORD or not MASTER_EMAIL:
                print("Email configuration not complete, skipping email")
                return
            
            approval_link = f"https://znlm131v-5000.inc1.devtunnels.ms/admin-verify?email={admin_email}"
            
            msg = MIMEMultipart()
            msg['Subject'] = 'New Admin Account Verification Required'
            msg['From'] = SMTP_EMAIL
            msg['To'] = MASTER_EMAIL
            
            body = f"""
            <html>
            <body>
                <h2>New Admin Account Verification</h2>
                <p>A new admin account has been created and requires your approval:</p>
                <ul>
                    <li><strong>Name:</strong> {admin_name}</li>
                    <li><strong>Email:</strong> {admin_email}</li>
                    <li><strong>Request Date:</strong> {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</li>
                </ul>
                <p>
                    <a href="{approval_link}" 
                       style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                              text-decoration: none; border-radius: 5px;">
                        Approve Admin Account
                    </a>
                </p>
                <p>If you cannot click the link, copy and paste this URL into your browser:</p>
                <p>{approval_link}</p>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(body, 'html'))
            
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, MASTER_EMAIL, msg.as_string())
            server.quit()
            
            print(f"✅ Admin verification email sent for {admin_email}")
            
        except Exception as e:
            print(f"❌ Failed to send admin verification email: {e}")
    
    def login_user(self, data):
        """Login user with Firebase token or mock token"""
        try:
            if db is None:  # FIX THIS LINE
                return format_response(error="Database connection not available", status=500)
            
            id_token = data.get('idToken')
            
            # Extract email from mock token for testing
            if id_token.startswith('simulated_firebase_token_'):
                email = id_token.replace('simulated_firebase_token_', '')
                uid = f"mock_uid_{email.replace('@', '_').replace('.', '_')}"
            else:
                # Try to verify with Firebase
                try:
                    if firebase_initialized:
                        decoded_token = firebase_auth.verify_id_token(id_token)
                        uid = decoded_token['uid']
                        email = decoded_token.get('email')
                    else:
                        return format_response(error="Firebase not initialized", status=500)
                except Exception as e:
                    return format_response(error=f"Invalid Firebase token: {str(e)}", status=401)
            
            # Check user in MongoDB
            user = db[USERS_COLLECTION].find_one({'firebase_uid': uid})
            if not user:
                return format_response(error="User not found", status=404)
            
            if user['status'] != USER_STATUS_APPROVED:
                return format_response(error="Account not approved", status=403)
            
            # Create session token
            session_data = {
                'uid': uid,
                'email': user['email'],
                'role': user['role'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8)
            }
            
            session_token = jwt.encode(session_data, JWT_SECRET, algorithm='HS256')
            
            # Store session in database
            session_doc = {
                'user_id': uid,
                'session_token': session_token,
                'expires_at': datetime.datetime.utcnow() + datetime.timedelta(hours=8),
                'created_at': datetime.datetime.utcnow(),
                'ip_address': None
            }
            
            db[SESSIONS_COLLECTION].insert_one(session_doc)
            
            # Update last login
            db[USERS_COLLECTION].update_one(
                {'firebase_uid': uid},
                {'$set': {'last_login': datetime.datetime.utcnow()}}
            )
            
            return format_response(
                data={
                    'session_token': session_token,
                    'user': {
                        'uid': uid,
                        'email': user['email'],
                        'name': user.get('name', ''),
                        'role': user['role']
                    }
                },
                message="Login successful",
                status=200
            )
            
        except Exception as e:
            print(f"Login error details: {e}")
            return format_response(error=f"Login failed: {str(e)}", status=401)

    
    def verify_admin(self, token):
        """Verify admin account (master admin approval)"""
        try:
            # For simplicity, token is email
            email = token
            
            user = db[USERS_COLLECTION].find_one({'email': email, 'role': ADMIN_ROLE})
            if not user:
                return format_response(error="Admin user not found", status=404)
            
            if user['status'] == USER_STATUS_APPROVED:
                return format_response(message="Admin already approved", status=200)
            
            # Update user status
            db[USERS_COLLECTION].update_one(
                {'email': email},
                {'$set': {'status': USER_STATUS_APPROVED}}
            )
            
            return format_response(message="Admin approved successfully", status=200)
            
        except Exception as e:
            return format_response(error=f"Admin verification failed: {str(e)}", status=400)
    
    def logout_user(self, request):
        """Logout user by invalidating session"""
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return format_response(error="No session token provided", status=400)
            
            session_token = auth_header.split(' ')[1]
            
            # Remove session from database
            result = db[SESSIONS_COLLECTION].delete_one({'session_token': session_token})
            
            if result.deleted_count == 0:
                return format_response(error="Session not found", status=404)
            
            return format_response(message="Logged out successfully", status=200)
            
        except Exception as e:
            return format_response(error=f"Logout failed: {str(e)}", status=400)
    
    def get_user_profile(self, request):
        """Get user profile information"""
        try:
            user_data = get_user_from_token(request)
            if not user_data:
                return format_response(error="Invalid session", status=401)
            
            user = db[USERS_COLLECTION].find_one({'firebase_uid': user_data['uid']})
            if not user:
                return format_response(error="User not found", status=404)
            
            profile_data = {
                'uid': user['firebase_uid'],
                'email': user['email'],
                'name': user.get('name', ''),
                'role': user['role'],
                'status': user['status'],
                'created_at': user['created_at'].isoformat(),
                'last_login': user['last_login'].isoformat() if user['last_login'] else None
            }
            
            return format_response(data=profile_data, status=200)
            
        except Exception as e:
            return format_response(error=f"Failed to fetch profile: {str(e)}", status=400)

class ResourceService:
    def get_resources(self, filters, page=1, limit=10):
        """Get resources with filtering and pagination"""
        try:
            query = {}
            
            # Apply filters
            if 'location' in filters and filters['location']:
                query['location'] = {'$regex': filters['location'], '$options': 'i'}
            
            if 'department' in filters and filters['department']:
                query['department'] = {'$regex': filters['department'], '$options': 'i'}
            
            if 'cost_min' in filters or 'cost_max' in filters:
                cost_query = {}
                if 'cost_min' in filters and filters['cost_min']:
                    cost_query['$gte'] = float(filters['cost_min'])
                if 'cost_max' in filters and filters['cost_max']:
                    cost_query['$lte'] = float(filters['cost_max'])
                if cost_query:
                    query['cost'] = cost_query
            
            if 'search' in filters and filters['search']:
                search_term = filters['search']
                query['$or'] = [
                    {'description': {'$regex': search_term, '$options': 'i'}},
                    {'sl_no': {'$regex': search_term, '$options': 'i'}},
                    {'service_tag': {'$regex': search_term, '$options': 'i'}},
                    {'identification_number': {'$regex': search_term, '$options': 'i'}}
                ]
            
            # Calculate pagination
            skip = (page - 1) * limit
            
            # Get resources
            resources = list(db[RESOURCES_COLLECTION].find(query).skip(skip).limit(limit).sort('created_at', -1))
            total = db[RESOURCES_COLLECTION].count_documents(query)
            
            # Convert ObjectId to string
            for resource in resources:
                resource['_id'] = str(resource['_id'])
                if 'created_at' in resource:
                    resource['created_at'] = resource['created_at'].isoformat()
                if 'updated_at' in resource:
                    resource['updated_at'] = resource['updated_at'].isoformat()
            
            return format_response(
                data={
                    'resources': resources,
                    'pagination': {
                        'page': page,
                        'limit': limit,
                        'total': total,
                        'pages': (total + limit - 1) // limit
                    }
                },
                status=200
            )
            
        except Exception as e:
            return format_response(error=f"Failed to fetch resources: {str(e)}", status=400)
    
    def create_resource(self, data, request):
        """Create a new resource"""
        try:
            # Validate required fields
            for field in RESOURCE_REQUIRED_FIELDS:
                if field not in data or not data[field]:
                    return format_response(error=f"Missing required field: {field}", status=400)
            
            # Get user data
            user_data = get_user_from_token(request)
            if not user_data:
                return format_response(error="Invalid session", status=401)
            
            # Prepare resource document
            resource_doc = {
                'sl_no': data['sl_no'],
                'description': data['description'],
                'service_tag': data['service_tag'],
                'identification_number': data['identification_number'],
                'procurement_date': data['procurement_date'],
                'cost': float(data['cost']),
                'location': data['location'],
                'department': data['department'],
                'created_by': user_data['email'],
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            }
            
            # Insert resource
            result = db[RESOURCES_COLLECTION].insert_one(resource_doc)
            
            return format_response(
                data={'resource_id': str(result.inserted_id)},
                message="Resource created successfully",
                status=201
            )
            
        except Exception as e:
            return format_response(error=f"Failed to create resource: {str(e)}", status=400)
    
    def get_resource(self, resource_id):
        """Get a specific resource"""
        try:
            if not ObjectId.is_valid(resource_id):
                return format_response(error="Invalid resource ID", status=400)
            
            resource = db[RESOURCES_COLLECTION].find_one({'_id': ObjectId(resource_id)})
            if not resource:
                return format_response(error="Resource not found", status=404)
            
            resource['_id'] = str(resource['_id'])
            if 'created_at' in resource:
                resource['created_at'] = resource['created_at'].isoformat()
            if 'updated_at' in resource:
                resource['updated_at'] = resource['updated_at'].isoformat()
            
            return format_response(data=resource, status=200)
            
        except Exception as e:
            return format_response(error=f"Failed to fetch resource: {str(e)}", status=400)
    
    def update_resource(self, resource_id, data, request):
        """Update a resource"""
        try:
            if not ObjectId.is_valid(resource_id):
                return format_response(error="Invalid resource ID", status=400)
            
            user_data = get_user_from_token(request)
            if not user_data:
                return format_response(error="Invalid session", status=401)
            
            # Remove empty fields
            update_data = {k: v for k, v in data.items() if v is not None and v != ''}
            
            # Convert cost to float if present
            if 'cost' in update_data:
                update_data['cost'] = float(update_data['cost'])
            
            # Add metadata
            update_data['updated_at'] = datetime.datetime.utcnow()
            update_data['updated_by'] = user_data['email']
            
            # Update resource
            result = db[RESOURCES_COLLECTION].update_one(
                {'_id': ObjectId(resource_id)},
                {'$set': update_data}
            )
            
            if result.matched_count == 0:
                return format_response(error="Resource not found", status=404)
            
            return format_response(message="Resource updated successfully", status=200)
            
        except Exception as e:
            return format_response(error=f"Failed to update resource: {str(e)}", status=400)
    
    def delete_resource(self, resource_id):
        """Delete a resource"""
        try:
            if not ObjectId.is_valid(resource_id):
                return format_response(error="Invalid resource ID", status=400)
            
            result = db[RESOURCES_COLLECTION].delete_one({'_id': ObjectId(resource_id)})
            
            if result.deleted_count == 0:
                return format_response(error="Resource not found", status=404)
            
            return format_response(message="Resource deleted successfully", status=200)
            
        except Exception as e:
            return format_response(error=f"Failed to delete resource: {str(e)}", status=400)
    
    def search_resources(self, query, filters):
        """Search resources with advanced filtering"""
        try:
            search_query = {}
            
            if query:
                search_query['$or'] = [
                    {'description': {'$regex': query, '$options': 'i'}},
                    {'sl_no': {'$regex': query, '$options': 'i'}},
                    {'service_tag': {'$regex': query, '$options': 'i'}},
                    {'identification_number': {'$regex': query, '$options': 'i'}},
                    {'location': {'$regex': query, '$options': 'i'}},
                    {'department': {'$regex': query, '$options': 'i'}}
                ]
            
            # Apply additional filters
            if 'location' in filters and filters['location']:
                search_query['location'] = {'$regex': filters['location'], '$options': 'i'}
            
            if 'department' in filters and filters['department']:
                search_query['department'] = {'$regex': filters['department'], '$options': 'i'}
            
            resources = list(db[RESOURCES_COLLECTION].find(search_query).limit(50))
            
            # Convert ObjectId to string
            for resource in resources:
                resource['_id'] = str(resource['_id'])
                if 'created_at' in resource:
                    resource['created_at'] = resource['created_at'].isoformat()
                if 'updated_at' in resource:
                    resource['updated_at'] = resource['updated_at'].isoformat()
            
            return format_response(data=resources, status=200)
            
        except Exception as e:
            return format_response(error=f"Search failed: {str(e)}", status=400)
    
    def dashboard_stats(self):
        """Get dashboard statistics"""
        try:
            total_resources = db[RESOURCES_COLLECTION].count_documents({})
            
            # Resources by location
            location_stats = list(db[RESOURCES_COLLECTION].aggregate([
                {'$group': {'_id': '$location', 'count': {'$sum': 1}}},
                {'$sort': {'count': -1}},
                {'$limit': 10}
            ]))
            
            # Resources by department
            department_stats = list(db[RESOURCES_COLLECTION].aggregate([
                {'$group': {'_id': '$department', 'count': {'$sum': 1}}},
                {'$sort': {'count': -1}},
                {'$limit': 10}
            ]))
            
            # Total cost
            total_cost = list(db[RESOURCES_COLLECTION].aggregate([
                {'$group': {'_id': None, 'total': {'$sum': '$cost'}}}
            ]))
            
            total_cost_value = total_cost[0]['total'] if total_cost else 0
            
            # Recent additions (last 7 days)
            week_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
            recent_additions = db[RESOURCES_COLLECTION].count_documents({
                'created_at': {'$gte': week_ago}
            })
            
            return format_response(
                data={
                    'total_resources': total_resources,
                    'total_cost': total_cost_value,
                    'recent_additions': recent_additions,
                    'location_stats': location_stats,
                    'department_stats': department_stats
                },
                status=200
            )
            
        except Exception as e:
            return format_response(error=f"Failed to fetch dashboard stats: {str(e)}", status=400)
    
    def dashboard_charts(self, chart_type):
        """Get chart data for dashboard"""
        try:
            chart_data = {}
            
            if chart_type in ['all', 'cost_trend']:
                # Cost trend over time
                cost_trend = list(db[RESOURCES_COLLECTION].aggregate([
                    {'$group': {
                        '_id': {
                            'year': {'$year': '$created_at'},
                            'month': {'$month': '$created_at'}
                        },
                        'total_cost': {'$sum': '$cost'},
                        'count': {'$sum': 1}
                    }},
                    {'$sort': {'_id.year': 1, '_id.month': 1}},
                    {'$limit': 12}
                ]))
                chart_data['cost_trend'] = cost_trend
            
            if chart_type in ['all', 'location_distribution']:
                # Location distribution
                location_dist = list(db[RESOURCES_COLLECTION].aggregate([
                    {'$group': {'_id': '$location', 'count': {'$sum': 1}}},
                    {'$sort': {'count': -1}}
                ]))
                chart_data['location_distribution'] = location_dist
            
            if chart_type in ['all', 'department_distribution']:
                # Department distribution
                dept_dist = list(db[RESOURCES_COLLECTION].aggregate([
                    {'$group': {'_id': '$department', 'count': {'$sum': 1}}},
                    {'$sort': {'count': -1}}
                ]))
                chart_data['department_distribution'] = dept_dist
            
            return format_response(data=chart_data, status=200)
            
        except Exception as e:
            return format_response(error=f"Failed to fetch chart data: {str(e)}", status=400)
    
    def recent_activity(self, limit=10):
        """Get recent activity"""
        try:
            recent_resources = list(db[RESOURCES_COLLECTION].find().sort('created_at', -1).limit(limit))
            
            for resource in recent_resources:
                resource['_id'] = str(resource['_id'])
                if 'created_at' in resource:
                    resource['created_at'] = resource['created_at'].isoformat()
                if 'updated_at' in resource:
                    resource['updated_at'] = resource['updated_at'].isoformat()
            
            return format_response(data=recent_resources, status=200)
            
        except Exception as e:
            return format_response(error=f"Failed to fetch recent activity: {str(e)}", status=400)
    
    def get_unique_values(self, field):
        """Get unique values for a field"""
        try:
            values = db[RESOURCES_COLLECTION].distinct(field)
            return format_response(data=values, status=200)
            
        except Exception as e:
            return format_response(error=f"Failed to fetch unique values: {str(e)}", status=400)

class AIService:
    def __init__(self):
        self.groq_url = "https://api.groq.com/openai/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
    
    def natural_crud(self, data, request):
        """Process natural language CRUD instructions"""
        try:
            instruction = data.get('instruction')
            user_data = get_user_from_token(request)
            
            # Enhanced parsing prompt with more specific JSON format
            parsing_prompt = f"""
    You are a database operation parser. Parse this natural language instruction for resource management:

    Instruction: "{instruction}"

    You must respond with ONLY a valid JSON object in this exact format:
    {{
        "operation": "CREATE|READ|UPDATE|DELETE",
        "fields": {{}},
        "filters": {{}},
        "missing_fields": [],
        "resource_id": null
    }}

    Rules:
    - operation: Must be CREATE, READ, UPDATE, or DELETE
    - fields: Object with field names and values to set/create
    - filters: Object with criteria to find resources
    - missing_fields: Array of required fields that are missing
    - resource_id: String ID if a specific resource is mentioned

    Required fields for CREATE: sl_no, description, service_tag, identification_number, procurement_date, cost, location, department

    Examples:
    - "update cost to 1000 for CSE department" → {{"operation": "UPDATE", "fields": {{"cost": "1000"}}, "filters": {{"department": "CSE"}}, "missing_fields": [], "resource_id": null}}
    - "create new monitor" → {{"operation": "CREATE", "fields": {{}}, "filters": {{}}, "missing_fields": ["sl_no", "description", "service_tag", "identification_number", "procurement_date", "cost", "location", "department"], "resource_id": null}}

    Parse: "{instruction}"
    """
            
            ai_response = self._call_groq_api(parsing_prompt)
            
            if not ai_response:
                return format_response(error="Failed to get AI response", status=500)
            
            # Clean the response - remove any non-JSON content
            try:
                # Try to find JSON in the response
                import re
                json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    parsed_data = json.loads(json_str)
                else:
                    # If no JSON found, create a basic structure
                    parsed_data = {
                        "operation": "READ",
                        "fields": {},
                        "filters": {},
                        "missing_fields": [],
                        "resource_id": None
                    }
                    
                    # Try to extract operation type from instruction
                    instruction_lower = instruction.lower()
                    if any(word in instruction_lower for word in ['create', 'add', 'new']):
                        parsed_data["operation"] = "CREATE"
                        parsed_data["missing_fields"] = RESOURCE_REQUIRED_FIELDS
                    elif any(word in instruction_lower for word in ['update', 'change', 'modify', 'edit']):
                        parsed_data["operation"] = "UPDATE"
                        # Try to extract fields from instruction
                        if 'cost' in instruction_lower:
                            import re
                            cost_match = re.search(r'(\d+)', instruction)
                            if cost_match:
                                parsed_data["fields"]["cost"] = cost_match.group(1)
                        if 'cse' in instruction_lower or 'CSE' in instruction:
                            parsed_data["filters"]["department"] = "CSE"
                    elif any(word in instruction_lower for word in ['delete', 'remove']):
                        parsed_data["operation"] = "DELETE"
                        
            except json.JSONDecodeError as e:
                print(f"JSON parsing error: {e}")
                print(f"AI response was: {ai_response}")
                
                # Fallback: create a basic response based on instruction keywords
                instruction_lower = instruction.lower()
                if any(word in instruction_lower for word in ['update', 'change', 'modify']):
                    parsed_data = {
                        "operation": "UPDATE",
                        "fields": {},
                        "filters": {},
                        "missing_fields": [],
                        "resource_id": None
                    }
                    
                    # Extract cost if mentioned
                    import re
                    cost_match = re.search(r'(\d+)', instruction)
                    if cost_match:
                        parsed_data["fields"]["cost"] = cost_match.group(1)
                    
                    # Extract department if mentioned
                    if 'cse' in instruction_lower:
                        parsed_data["filters"]["department"] = "CSE"
                    elif 'ece' in instruction_lower:
                        parsed_data["filters"]["department"] = "ECE"
                    elif 'eee' in instruction_lower:
                        parsed_data["filters"]["department"] = "EEE"
                        
                else:
                    return format_response(
                        error=f"Could not parse instruction. AI response: {ai_response[:200]}...", 
                        status=500
                    )
            
            # Validate the parsed data structure
            if not isinstance(parsed_data, dict):
                return format_response(error="Invalid response structure", status=500)
                
            # Ensure required keys exist
            required_keys = ["operation", "fields", "filters", "missing_fields", "resource_id"]
            for key in required_keys:
                if key not in parsed_data:
                    parsed_data[key] = [] if key == "missing_fields" else ({} if key in ["fields", "filters"] else None)
            
            # Check for missing fields
            if parsed_data.get('missing_fields'):
                return format_response(
                    data={
                        'missing_fields': parsed_data['missing_fields'],
                        'message': f"Please provide the following fields: {', '.join(parsed_data['missing_fields'])}"
                    },
                    status=400
                )
            
            # Execute the operation
            operation = parsed_data.get('operation', '').upper()
            
            if operation == 'CREATE':
                return self._execute_create(parsed_data.get('fields', {}), user_data)
            elif operation == 'READ':
                return self._execute_read(parsed_data.get('filters', {}))
            elif operation == 'UPDATE':
                return self._execute_update_bulk(
                    parsed_data.get('filters', {}),
                    parsed_data.get('fields', {}),
                    user_data
                )
            elif operation == 'DELETE':
                return self._execute_delete_bulk(parsed_data.get('filters', {}))
            else:
                return format_response(error=f"Unknown operation: {operation}", status=400)
            
        except Exception as e:
            print(f"Natural CRUD error: {e}")
            return format_response(error=f"Natural CRUD failed: {str(e)}", status=500)

    def _call_groq_api(self, prompt):
        """Call Groq API with better error handling"""
        try:
            payload = {
                "model": "llama3-8b-8192",
                "messages": [
                    {
                        "role": "system", 
                        "content": "You are a precise database operation parser. Always respond with valid JSON only."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                "max_tokens": 500,
                "temperature": 0.1
            }
            
            response = requests.post(self.groq_url, headers=self.headers, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            if 'choices' in result and len(result['choices']) > 0:
                return result['choices'][0]['message']['content'].strip()
            else:
                print(f"Unexpected Groq response structure: {result}")
                return None
                
        except requests.exceptions.Timeout:
            print("Groq API timeout")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Groq API request error: {e}")
            return None
        except Exception as e:
            print(f"Groq API error: {e}")
            return None

    def _execute_create(self, fields, user_data):
        """Execute CREATE operation"""
        try:
            resource_doc = {
                'sl_no': fields.get('sl_no'),
                'description': fields.get('description'),
                'service_tag': fields.get('service_tag'),
                'identification_number': fields.get('identification_number'),
                'procurement_date': fields.get('procurement_date'),
                'cost': float(fields.get('cost', 0)),
                'location': fields.get('location'),
                'department': fields.get('department'),
                'created_by': user_data['email'],
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            }
            
            result = db[RESOURCES_COLLECTION].insert_one(resource_doc)
            
            return format_response(
                data={'resource_id': str(result.inserted_id)},
                message="Resource created successfully via AI",
                status=201
            )
            
        except Exception as e:
            return format_response(error=f"Create operation failed: {str(e)}", status=400)
    
    def _execute_read(self, filters):
        """Execute READ operation"""
        try:
            query = {}
            for key, value in filters.items():
                if key in ['location', 'department', 'description']:
                    query[key] = {'$regex': value, '$options': 'i'}
                else:
                    query[key] = value
            
            resources = list(db[RESOURCES_COLLECTION].find(query).limit(10))
            
            for resource in resources:
                resource['_id'] = str(resource['_id'])
                if 'created_at' in resource:
                    resource['created_at'] = resource['created_at'].isoformat()
                if 'updated_at' in resource:
                    resource['updated_at'] = resource['updated_at'].isoformat()
            
            return format_response(data=resources, status=200)
            
        except Exception as e:
            return format_response(error=f"Read operation failed: {str(e)}", status=400)
    
    def _execute_update(self, resource_id, fields, user_data):
        """Execute UPDATE operation"""
        try:
            if not resource_id or not ObjectId.is_valid(resource_id):
                return format_response(error="Invalid resource ID", status=400)
            
            update_data = {k: v for k, v in fields.items() if v is not None}
            if 'cost' in update_data:
                update_data['cost'] = float(update_data['cost'])
            
            update_data['updated_at'] = datetime.datetime.utcnow()
            update_data['updated_by'] = user_data['email']
            
            result = db[RESOURCES_COLLECTION].update_one(
                {'_id': ObjectId(resource_id)},
                {'$set': update_data}
            )
            
            if result.matched_count == 0:
                return format_response(error="Resource not found", status=404)
            
            return format_response(message="Resource updated successfully via AI", status=200)
            
        except Exception as e:
            return format_response(error=f"Update operation failed: {str(e)}", status=400)
    
    def _execute_delete(self, resource_id):
        """Execute DELETE operation"""
        try:
            if not resource_id or not ObjectId.is_valid(resource_id):
                return format_response(error="Invalid resource ID", status=400)
            
            result = db[RESOURCES_COLLECTION].delete_one({'_id': ObjectId(resource_id)})
            
            if result.deleted_count == 0:
                return format_response(error="Resource not found", status=404)
            
            return format_response(message="Resource deleted successfully via AI", status=200)
            
        except Exception as e:
            return format_response(error=f"Delete operation failed: {str(e)}", status=400)
    
    def chat(self, data, request):
        """Handle chat queries about resources"""
        try:
            message = data.get('message')
            user_data = get_user_from_token(request)
            
            # Get context about resources
            context = self._get_resource_context()
            
            # Create chat prompt
            chat_prompt = f"""
            You are a resource management assistant. Answer questions about the resources based on the following context:
            
            Context: {context}
            
            User question: {message}
            
            Provide a helpful and accurate response about the resources. If you need specific data that's not in the context, ask for clarification.
            """
            
            ai_response = self._call_groq_api(chat_prompt)
            
            if not ai_response:
                return format_response(error="Failed to get response", status=500)
            
            # Save chat history
            chat_doc = {
                'user_id': user_data['uid'],
                'message': message,
                'response': ai_response,
                'timestamp': datetime.datetime.utcnow()
            }
            
            db[CHAT_HISTORY_COLLECTION].insert_one(chat_doc)
            
            return format_response(
                data={
                    'response': ai_response,
                    'timestamp': datetime.datetime.utcnow().isoformat()
                },
                status=200
            )
            
        except Exception as e:
            return format_response(error=f"Chat failed: {str(e)}", status=500)
    
    def _get_resource_context(self):
        """Get context about current resources"""
        try:
            total_resources = db[RESOURCES_COLLECTION].count_documents({})
            
            # Get sample resources
            sample_resources = list(db[RESOURCES_COLLECTION].find().limit(5))
            
            # Get stats
            locations = db[RESOURCES_COLLECTION].distinct('location')
            departments = db[RESOURCES_COLLECTION].distinct('department')
            
            context = {
                'total_resources': total_resources,
                'locations': locations,
                'departments': departments,
                'sample_resources': [
                    {
                        'description': r.get('description'),
                        'location': r.get('location'),
                        'department': r.get('department'),
                        'cost': r.get('cost')
                    } for r in sample_resources
                ]
            }
            
            return json.dumps(context, indent=2)
            
        except Exception as e:
            return "No resource context available"
    
    def chat_history(self, user_id, page, limit, request):
        """Get chat history"""
        try:
            user_data = get_user_from_token(request)
            
            # If no user_id provided, use current user
            if not user_id:
                user_id = user_data['uid']
            
            # Check if user can access this history
            if user_data['role'] != ADMIN_ROLE and user_id != user_data['uid']:
                return format_response(error="Access denied", status=403)
            
            skip = (page - 1) * limit
            
            history = list(db[CHAT_HISTORY_COLLECTION].find(
                {'user_id': user_id}
            ).sort('timestamp', -1).skip(skip).limit(limit))
            
            for chat in history:
                chat['_id'] = str(chat['_id'])
                chat['timestamp'] = chat['timestamp'].isoformat()
            
            return format_response(data=history, status=200)
            
        except Exception as e:
            return format_response(error=f"Failed to fetch chat history: {str(e)}", status=400)
    def _execute_update_bulk(self, filters, fields, user_data):
        """Execute UPDATE operation on multiple resources"""
        try:
            if not filters:
                return format_response(error="No filters provided for update", status=400)
            
            if not fields:
                return format_response(error="No fields provided for update", status=400)
            
            # Build query from filters
            query = {}
            for key, value in filters.items():
                if key in ['location', 'department', 'description']:
                    query[key] = {'$regex': value, '$options': 'i'}
                else:
                    query[key] = value
            
            # Prepare update data
            update_data = {k: v for k, v in fields.items() if v is not None}
            if 'cost' in update_data:
                update_data['cost'] = float(update_data['cost'])
            
            update_data['updated_at'] = datetime.datetime.utcnow()
            update_data['updated_by'] = user_data['email']
            
            # Update resources
            result = db[RESOURCES_COLLECTION].update_many(query, {'$set': update_data})
            
            return format_response(
                data={
                    'matched_count': result.matched_count,
                    'modified_count': result.modified_count,
                    'filters_used': filters,
                    'fields_updated': fields
                },
                message=f"Updated {result.modified_count} resources via AI",
                status=200
            )
            
        except Exception as e:
            return format_response(error=f"Bulk update operation failed: {str(e)}", status=400)

    def _execute_delete_bulk(self, filters):
        """Execute DELETE operation on multiple resources"""
        try:
            if not filters:
                return format_response(error="No filters provided for delete", status=400)
            
            # Build query from filters
            query = {}
            for key, value in filters.items():
                if key in ['location', 'department', 'description']:
                    query[key] = {'$regex': value, '$options': 'i'}
                else:
                    query[key] = value
            
            # Count resources to be deleted
            count = db[RESOURCES_COLLECTION].count_documents(query)
            
            if count == 0:
                return format_response(error="No resources found matching the criteria", status=404)
            
            # Delete resources
            result = db[RESOURCES_COLLECTION].delete_many(query)
            
            return format_response(
                data={
                    'deleted_count': result.deleted_count,
                    'filters_used': filters
                },
                message=f"Deleted {result.deleted_count} resources via AI",
                status=200
            )
            
        except Exception as e:
            return format_response(error=f"Bulk delete operation failed: {str(e)}", status=400)

class FileService:
    def upload_csv(self, file, request):
        """Upload and process CSV file"""
        try:
            if not file or not file.filename:
                return format_response(error="No file provided", status=400)
            
            if not file.filename.endswith('.csv'):
                return format_response(error="File must be CSV format", status=400)
            
            user_data = get_user_from_token(request)
            
            # Read CSV
            df = pd.read_csv(file)
            
            # Validate columns
            required_columns = list(CSV_COLUMN_MAPPING.keys())
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                return format_response(
                    error=f"Missing columns: {', '.join(missing_columns)}",
                    status=400
                )
            
            # Process rows
            success_count = 0
            error_count = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # Map CSV columns to database fields
                    resource_doc = {}
                    for csv_col, db_field in CSV_COLUMN_MAPPING.items():
                        resource_doc[db_field] = row[csv_col]
                    
                    # Convert cost to float
                    resource_doc['cost'] = float(resource_doc['cost'])
                    
                    # Add metadata
                    resource_doc['created_by'] = user_data['email']
                    resource_doc['created_at'] = datetime.datetime.utcnow()
                    resource_doc['updated_at'] = datetime.datetime.utcnow()
                    
                    # Insert resource
                    db[RESOURCES_COLLECTION].insert_one(resource_doc)
                    success_count += 1
                    
                except Exception as e:
                    error_count += 1
                    errors.append(f"Row {index + 1}: {str(e)}")
            
            return format_response(
                data={
                    'success_count': success_count,
                    'error_count': error_count,
                    'errors': errors[:10]  # Limit error messages
                },
                message=f"CSV processed. {success_count} records added, {error_count} errors.",
                status=200
            )
            
        except Exception as e:
            return format_response(error=f"CSV upload failed: {str(e)}", status=500)
    
    def upload_excel(self, file, request):
        """Upload and process Excel file"""
        try:
            if not file or not file.filename:
                return format_response(error="No file provided", status=400)
            
            if not file.filename.endswith(('.xlsx', '.xls')):
                return format_response(error="File must be Excel format", status=400)
            
            user_data = get_user_from_token(request)
            
            # Read Excel
            df = pd.read_excel(file)
            
            # Validate columns
            required_columns = list(CSV_COLUMN_MAPPING.keys())
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                return format_response(
                    error=f"Missing columns: {', '.join(missing_columns)}",
                    status=400
                )
            
            # Process rows (same as CSV)
            success_count = 0
            error_count = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    resource_doc = {}
                    for csv_col, db_field in CSV_COLUMN_MAPPING.items():
                        resource_doc[db_field] = row[csv_col]
                    
                    resource_doc['cost'] = float(resource_doc['cost'])
                    resource_doc['created_by'] = user_data['email']
                    resource_doc['created_at'] = datetime.datetime.utcnow()
                    resource_doc['updated_at'] = datetime.datetime.utcnow()
                    
                    db[RESOURCES_COLLECTION].insert_one(resource_doc)
                    success_count += 1
                    
                except Exception as e:
                    error_count += 1
                    errors.append(f"Row {index + 1}: {str(e)}")
            
            return format_response(
                data={
                    'success_count': success_count,
                    'error_count': error_count,
                    'errors': errors[:10]
                },
                message=f"Excel processed. {success_count} records added, {error_count} errors.",
                status=200
            )
            
        except Exception as e:
            return format_response(error=f"Excel upload failed: {str(e)}", status=500)
    
    def export_csv(self, filters):
        """Export resources to CSV"""
        try:
            # Build query from filters
            query = {}
            if 'location' in filters and filters['location']:
                query['location'] = filters['location']
            if 'department' in filters and filters['department']:
                query['department'] = filters['department']
            
            # Get resources
            resources = list(db[RESOURCES_COLLECTION].find(query))
            
            if not resources:
                return format_response(error="No data found", status=404)
            
            # Convert to DataFrame
            df = pd.DataFrame(resources)
            
            # Remove MongoDB-specific fields
            df.drop(columns=['_id', 'created_at', 'updated_at', 'created_by'], inplace=True, errors='ignore')
            
            # Rename columns to match CSV format
            reverse_mapping = {v: k for k, v in CSV_COLUMN_MAPPING.items()}
            df.rename(columns=reverse_mapping, inplace=True)
            
            # Convert to CSV
            csv_data = df.to_csv(index=False)
            
            # Create response
            output = io.BytesIO()
            output.write(csv_data.encode('utf-8'))
            output.seek(0)
            
            return send_file(
                output,
                mimetype='text/csv',
                as_attachment=True,
                download_name='resources_export.csv'
            )
            
        except Exception as e:
            return format_response(error=f"CSV export failed: {str(e)}", status=500)
    
    def export_excel(self, filters):
        """Export resources to Excel"""
        try:
            # Build query from filters
            query = {}
            if 'location' in filters and filters['location']:
                query['location'] = filters['location']
            if 'department' in filters and filters['department']:
                query['department'] = filters['department']
            
            # Get resources
            resources = list(db[RESOURCES_COLLECTION].find(query))
            
            if not resources:
                return format_response(error="No data found", status=404)
            
            # Convert to DataFrame
            df = pd.DataFrame(resources)
            
            # Remove MongoDB-specific fields
            df.drop(columns=['_id', 'created_at', 'updated_at', 'created_by'], inplace=True, errors='ignore')
            
            # Rename columns to match CSV format
            reverse_mapping = {v: k for k, v in CSV_COLUMN_MAPPING.items()}
            df.rename(columns=reverse_mapping, inplace=True)
            
            # Create Excel file
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Resources')
            
            output.seek(0)
            
            return send_file(
                output,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name='resources_export.xlsx'
            )
            
        except Exception as e:
            return format_response(error=f"Excel export failed: {str(e)}", status=500)
