from flask import Flask, request, jsonify, session, send_file
from flask_cors import CORS
import traceback
import datetime
import uuid

# Import everything from our modules
from config import (
    FLASK_SECRET_KEY, ADMIN_ROLE, VIEWER_ROLE, db,
    USERS_COLLECTION, RESOURCES_COLLECTION, SESSIONS_COLLECTION, CHAT_HISTORY_COLLECTION,
    USER_STATUS_PENDING, USER_STATUS_APPROVED, USER_STATUS_REJECTED
)
from services import AuthService, ResourceService, AIService, FileService
from utils import login_required, admin_required, validate_request_data, format_response

app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY
CORS(app, supports_credentials=True, origins=["*"])

# Initialize services
auth_service = AuthService()
resource_service = ResourceService()
ai_service = AIService()
file_service = FileService()

# Error handler
@app.errorhandler(Exception)
def handle_error(e):
    app.logger.error(f"Unhandled exception: {str(e)}")
    app.logger.error(traceback.format_exc())
    return format_response(error="Internal server error", status=500)

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return format_response(message="Backend is running", status=200)

# ==================== AUTHENTICATION ROUTES ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        validation_error = validate_request_data(data, ['email', 'password', 'role'])
        if validation_error:
            return validation_error
        
        return auth_service.register_user(data)
    except Exception as e:
        app.logger.error(f"Registration error: {str(e)}")
        return format_response(error="Registration failed", status=400)

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        validation_error = validate_request_data(data, ['idToken'])
        if validation_error:
            return validation_error
        
        return auth_service.login_user(data)
    except Exception as e:
        app.logger.error(f"Login error: {str(e)}")
        return format_response(error="Login failed", status=401)

@app.route('/api/auth/verify-admin', methods=['GET'])
def verify_admin():
    try:
        token = request.args.get('token')
        if not token:
            return format_response(error="Verification token required", status=400)
        
        return auth_service.verify_admin(token)
    except Exception as e:
        app.logger.error(f"Admin verification error: {str(e)}")
        return format_response(error="Admin verification failed", status=400)

@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    try:
        return auth_service.logout_user(request)
    except Exception as e:
        app.logger.error(f"Logout error: {str(e)}")
        return format_response(error="Logout failed", status=400)

@app.route('/api/auth/profile', methods=['GET'])
@login_required
def get_profile():
    try:
        return auth_service.get_user_profile(request)
    except Exception as e:
        app.logger.error(f"Profile fetch error: {str(e)}")
        return format_response(error="Failed to fetch profile", status=400)

# ==================== RESOURCE ROUTES ====================

@app.route('/api/resources', methods=['GET'])
@login_required
def get_resources():
    try:
        filters = request.args.to_dict()
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        
        return resource_service.get_resources(filters, page, limit)
    except Exception as e:
        app.logger.error(f"Get resources error: {str(e)}")
        return format_response(error="Failed to fetch resources", status=400)

@app.route('/api/resources', methods=['POST'])
@login_required
@admin_required
def create_resource():
    try:
        data = request.get_json()
        return resource_service.create_resource(data, request)
    except Exception as e:
        app.logger.error(f"Create resource error: {str(e)}")
        return format_response(error="Failed to create resource", status=400)

@app.route('/api/resources/<resource_id>', methods=['GET'])
@login_required
def get_resource(resource_id):
    try:
        return resource_service.get_resource(resource_id)
    except Exception as e:
        app.logger.error(f"Get resource error: {str(e)}")
        return format_response(error="Failed to fetch resource", status=400)

@app.route('/api/resources/<resource_id>', methods=['PUT'])
@login_required
@admin_required
def update_resource(resource_id):
    try:
        data = request.get_json()
        return resource_service.update_resource(resource_id, data, request)
    except Exception as e:
        app.logger.error(f"Update resource error: {str(e)}")
        return format_response(error="Failed to update resource", status=400)

@app.route('/api/resources/<resource_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_resource(resource_id):
    try:
        return resource_service.delete_resource(resource_id)
    except Exception as e:
        app.logger.error(f"Delete resource error: {str(e)}")
        return format_response(error="Failed to delete resource", status=400)

@app.route('/api/resources/search', methods=['GET'])
@login_required
def search_resources():
    try:
        query = request.args.get('q', '')
        filters = request.args.to_dict()
        return resource_service.search_resources(query, filters)
    except Exception as e:
        app.logger.error(f"Search resources error: {str(e)}")
        return format_response(error="Search failed", status=400)

# ==================== FILE UPLOAD/EXPORT ROUTES ====================

@app.route('/api/upload/csv', methods=['POST'])
@login_required
@admin_required
def upload_csv():
    try:
        if 'file' not in request.files:
            return format_response(error="No file provided", status=400)
        
        file = request.files['file']
        return file_service.upload_csv(file, request)
    except Exception as e:
        app.logger.error(f"CSV upload error: {str(e)}")
        return format_response(error="CSV upload failed", status=400)

@app.route('/api/upload/excel', methods=['POST'])
@login_required
@admin_required
def upload_excel():
    try:
        if 'file' not in request.files:
            return format_response(error="No file provided", status=400)
        
        file = request.files['file']
        return file_service.upload_excel(file, request)
    except Exception as e:
        app.logger.error(f"Excel upload error: {str(e)}")
        return format_response(error="Excel upload failed", status=400)

@app.route('/api/export/csv', methods=['GET'])
@login_required
def export_csv():
    try:
        filters = request.args.to_dict()
        return file_service.export_csv(filters)
    except Exception as e:
        app.logger.error(f"CSV export error: {str(e)}")
        return format_response(error="CSV export failed", status=400)

@app.route('/api/export/excel', methods=['GET'])
@login_required
def export_excel():
    try:
        filters = request.args.to_dict()
        return file_service.export_excel(filters)
    except Exception as e:
        app.logger.error(f"Excel export error: {str(e)}")
        return format_response(error="Excel export failed", status=400)

# ==================== AI ROUTES ====================

@app.route('/api/ai/natural-crud', methods=['POST'])
@login_required
@admin_required
def natural_crud():
    try:
        data = request.get_json()
        validation_error = validate_request_data(data, ['instruction'])
        if validation_error:
            return validation_error
        
        return ai_service.natural_crud(data, request)
    except Exception as e:
        app.logger.error(f"Natural CRUD error: {str(e)}")
        return format_response(error="Natural CRUD operation failed", status=400)

@app.route('/api/ai/chat', methods=['POST'])
@login_required
def chat():
    try:
        data = request.get_json()
        validation_error = validate_request_data(data, ['message'])
        if validation_error:
            return validation_error
        
        return ai_service.chat(data, request)
    except Exception as e:
        app.logger.error(f"Chat error: {str(e)}")
        return format_response(error="Chat request failed", status=400)

@app.route('/api/ai/chat/history', methods=['GET'])
@login_required
def chat_history():
    try:
        user_id = request.args.get('user_id')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        
        return ai_service.chat_history(user_id, page, limit, request)
    except Exception as e:
        app.logger.error(f"Chat history error: {str(e)}")
        return format_response(error="Failed to fetch chat history", status=400)

# ==================== DASHBOARD ROUTES ====================

@app.route('/api/dashboard/stats', methods=['GET'])
@login_required
def dashboard_stats():
    try:
        return resource_service.dashboard_stats()
    except Exception as e:
        app.logger.error(f"Dashboard stats error: {str(e)}")
        return format_response(error="Failed to fetch dashboard stats", status=400)

@app.route('/api/dashboard/charts', methods=['GET'])
@login_required
def dashboard_charts():
    try:
        chart_type = request.args.get('type', 'all')
        return resource_service.dashboard_charts(chart_type)
    except Exception as e:
        app.logger.error(f"Dashboard charts error: {str(e)}")
        return format_response(error="Failed to fetch chart data", status=400)

@app.route('/api/dashboard/recent-activity', methods=['GET'])
@login_required
def recent_activity():
    try:
        limit = int(request.args.get('limit', 10))
        return resource_service.recent_activity(limit)
    except Exception as e:
        app.logger.error(f"Recent activity error: {str(e)}")
        return format_response(error="Failed to fetch recent activity", status=400)

# ==================== UTILITY ROUTES ====================

@app.route('/api/locations', methods=['GET'])
@login_required
def get_locations():
    try:
        return resource_service.get_unique_values('location')
    except Exception as e:
        app.logger.error(f"Get locations error: {str(e)}")
        return format_response(error="Failed to fetch locations", status=400)

@app.route('/api/departments', methods=['GET'])
@login_required
def get_departments():
    try:
        return resource_service.get_unique_values('department')
    except Exception as e:
        app.logger.error(f"Get departments error: {str(e)}")
        return format_response(error="Failed to fetch departments", status=400)

# ==================== ADMIN VERIFICATION WEB ROUTES ====================

@app.route('/admin-verify', methods=['GET'])
def admin_verify_page():
    """Serve admin verification page"""
    email = request.args.get('email')
    if not email:
        return """
        <html>
        <head><title>Admin Verification</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2 style="color: #e74c3c;">❌ Error</h2>
            <p>No email specified for verification.</p>
            <a href="/" style="color: #3498db;">← Back to Home</a>
        </body>
        </html>
        """
    
    # Check if user exists and is admin
    try:
        if db is None:
            return """
            <html>
            <head><title>Admin Verification</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                <h2 style="color: #e74c3c;">❌ Database Error</h2>
                <p>Database connection not available.</p>
                <a href="/" style="color: #3498db;">← Back to Home</a>
            </body>
            </html>
            """
        
        user = db[USERS_COLLECTION].find_one({'email': email, 'role': ADMIN_ROLE})
        if not user:
            return f"""
            <html>
            <head><title>Admin Verification</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                <h2 style="color: #e74c3c;">❌ Error</h2>
                <p>Admin user not found: {email}</p>
                <a href="/" style="color: #3498db;">← Back to Home</a>
            </body>
            </html>
            """
        
        if user['status'] == USER_STATUS_APPROVED:
            return f"""
            <html>
            <head><title>Admin Verification</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                <h2 style="color: #27ae60;">✅ Already Approved</h2>
                <p>Admin user <strong>{email}</strong> is already approved.</p>
                <div style="background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Name:</strong> {user.get('name', 'N/A')}</p>
                    <p><strong>Email:</strong> {user['email']}</p>
                    <p><strong>Role:</strong> {user['role']}</p>
                    <p><strong>Status:</strong> {user['status']}</p>
                    <p><strong>Created:</strong> {user['created_at'].strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
                </div>
                <a href="/" style="color: #3498db;">← Back to Home</a>
            </body>
            </html>
            """
        
        # Show verification form
        return f"""
        <html>
        <head>
            <title>Admin Verification - Campus Assets</title>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f8f9fa; }}
                .container {{ background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .user-info {{ background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                .buttons {{ text-align: center; margin: 30px 0; }}
                .btn {{ padding: 12px 30px; margin: 0 10px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; text-decoration: none; display: inline-block; }}
                .btn-approve {{ background: #27ae60; color: white; }}
                .btn-reject {{ background: #e74c3c; color: white; }}
                .btn:hover {{ opacity: 0.8; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="color: #2c3e50;">🔐 Admin Account Verification</h1>
                    <p>Please review and approve/reject this admin account request:</p>
                </div>
                
                <div class="user-info">
                    <h3>User Details:</h3>
                    <p><strong>Name:</strong> {user.get('name', 'N/A')}</p>
                    <p><strong>Email:</strong> {user['email']}</p>
                    <p><strong>Role:</strong> {user['role']}</p>
                    <p><strong>Current Status:</strong> {user['status']}</p>
                    <p><strong>Registration Date:</strong> {user['created_at'].strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
                </div>
                
                <div class="buttons">
                    <a href="/admin-verify-action?email={email}&action=approve" class="btn btn-approve">
                        ✅ Approve Admin
                    </a>
                    <a href="/admin-verify-action?email={email}&action=reject" class="btn btn-reject">
                        ❌ Reject Admin
                    </a>
                </div>
                
                <p style="text-align: center; color: #7f8c8d; margin-top: 30px;">
                    Campus Assets Management System
                </p>
            </div>
        </body>
        </html>
        """
        
    except Exception as e:
        return f"""
        <html>
        <head><title>Admin Verification</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2 style="color: #e74c3c;">❌ Error</h2>
            <p>An error occurred: {str(e)}</p>
            <a href="/" style="color: #3498db;">← Back to Home</a>
        </body>
        </html>
        """

@app.route('/admin-verify-action', methods=['GET'])
def admin_verify_action():
    """Handle admin approval/rejection"""
    email = request.args.get('email')
    action = request.args.get('action')
    
    if not email or not action:
        return """
        <html>
        <head><title>Admin Verification</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2 style="color: #e74c3c;">❌ Error</h2>
            <p>Missing email or action parameter.</p>
            <a href="/" style="color: #3498db;">← Back to Home</a>
        </body>
        </html>
        """
    
    try:
        if db is None:
            return """
            <html>
            <head><title>Admin Verification</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                <h2 style="color: #e74c3c;">❌ Database Error</h2>
                <p>Database connection not available.</p>
                <a href="/" style="color: #3498db;">← Back to Home</a>
            </body>
            </html>
            """
        
        user = db[USERS_COLLECTION].find_one({'email': email, 'role': ADMIN_ROLE})
        if not user:
            return f"""
            <html>
            <head><title>Admin Verification</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                <h2 style="color: #e74c3c;">❌ Error</h2>
                <p>Admin user not found: {email}</p>
                <a href="/" style="color: #3498db;">← Back to Home</a>
            </body>
            </html>
            """
        
        if action == 'approve':
            # Approve the admin
            db[USERS_COLLECTION].update_one(
                {'email': email},
                {'$set': {'status': USER_STATUS_APPROVED}}
            )
            
            # Send approval notification email
            try:
                auth_service.send_approval_notification(email, user.get('name', ''), approved=True)
            except:
                pass  # Don't fail if email doesn't work
            
            return f"""
            <html>
            <head>
                <title>Admin Approved - Campus Assets</title>
                <style>
                    body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f8f9fa; }}
                    .container {{ background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 style="color: #27ae60;">✅ Admin Approved Successfully!</h1>
                    <p>Admin user <strong>{email}</strong> has been approved and can now access the system.</p>
                    <p>The user has been notified via email.</p>
                    <div style="background: #d5f4e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Action:</strong> Approved</p>
                        <p><strong>Admin Email:</strong> {email}</p>
                        <p><strong>Admin Name:</strong> {user.get('name', 'N/A')}</p>
                        <p><strong>Timestamp:</strong> {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
                    </div>
                    <a href="/" style="color: #3498db;">← Back to Home</a>
                </div>
            </body>
            </html>
            """
            
        elif action == 'reject':
            # Reject the admin
            db[USERS_COLLECTION].update_one(
                {'email': email},
                {'$set': {'status': USER_STATUS_REJECTED}}
            )
            
            # Send rejection notification email
            try:
                auth_service.send_approval_notification(email, user.get('name', ''), approved=False)
            except:
                pass  # Don't fail if email doesn't work
            
            return f"""
            <html>
            <head>
                <title>Admin Rejected - Campus Assets</title>
                <style>
                    body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f8f9fa; }}
                    .container {{ background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 style="color: #e74c3c;">❌ Admin Rejected</h1>
                    <p>Admin user <strong>{email}</strong> has been rejected.</p>
                    <p>The user has been notified via email.</p>
                    <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Action:</strong> Rejected</p>
                        <p><strong>Admin Email:</strong> {email}</p>
                        <p><strong>Admin Name:</strong> {user.get('name', 'N/A')}</p>
                        <p><strong>Timestamp:</strong> {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
                    </div>
                    <a href="/" style="color: #3498db;">← Back to Home</a>
                </div>
            </body>
            </html>
            """
        else:
            return """
            <html>
            <head><title>Admin Verification</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                <h2 style="color: #e74c3c;">❌ Error</h2>
                <p>Invalid action. Must be 'approve' or 'reject'.</p>
                <a href="/" style="color: #3498db;">← Back to Home</a>
            </body>
            </html>
            """
            
    except Exception as e:
        return f"""
        <html>
        <head><title>Admin Verification</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2 style="color: #e74c3c;">❌ Error</h2>
            <p>An error occurred: {str(e)}</p>
            <a href="/" style="color: #3498db;">← Back to Home</a>
        </body>
        </html>
        """

@app.route('/', methods=['GET'])
def home():
    """Simple home page"""
    return """
    <html>
    <head>
        <title>Campus Assets Management System</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f8f9fa; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 style="color: #2c3e50;">🏫 Campus Assets Management System</h1>
            <p>Backend API is running successfully!</p>
            <div style="background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>Available Endpoints:</h3>
                <p><strong>Health Check:</strong> <a href="/api/health">/api/health</a></p>
                <p><strong>API Documentation:</strong> Coming soon with frontend</p>
            </div>
            <p style="color: #7f8c8d;">Use the test CLI or connect your frontend application</p>
        </div>
    </body>
    </html>
    """

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
