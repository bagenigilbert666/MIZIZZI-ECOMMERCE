# Routes Configuration - Carousel Upload System

## Backend Routes Registration

### Route File Location
`backend/app/routes/admin/admin_upload_routes.py`

### Blueprint Registration
```python
# Line 16 in admin_upload_routes.py
admin_upload_routes = Blueprint('admin_upload', __name__)
```

### Routes Defined
```python
# Line 154
@admin_upload_routes.route('/upload/image', methods=['POST', 'OPTIONS'])
def upload_image():
    """Upload product image with compression"""

# Line 427 (NEW)
@admin_upload_routes.route('/upload/carousel-banner', methods=['POST', 'OPTIONS'])
def upload_carousel_banner():
    """Upload carousel banner with aggressive compression"""
```

### Registration in Flask App
**File:** `backend/app/__init__.py`

**Blueprint Loading (Line 729-732):**
```python
'admin_upload_routes': [
    ('app.routes.admin.admin_upload_routes', 'admin_upload_routes'),
    ('routes.admin.admin_upload_routes', 'admin_upload_routes')
]
```

**Blueprint Registration (Line 1022):**
```python
app.register_blueprint(final_blueprints['admin_upload_routes'], url_prefix='/api/admin')
```

**Result:** Routes are available at `/api/admin/upload/*`

## Full URL Paths

### Product Image Upload
```
POST /api/admin/upload/image
```

### Carousel Banner Upload (NEW)
```
POST /api/admin/upload/carousel-banner
```

### Serve Uploaded Files (Public)
```
GET /api/uploads/<path:filename>
GET /api/uploads/carousel_banners/<filename>
```

## Frontend Integration

### ImageUploader Component
**File:** `frontend/components/admin/image-uploader.tsx`

**Endpoints Used:**
```typescript
const endpoint = type === "carousel"
  ? "/api/admin/upload/carousel-banner"
  : "/api/admin/upload/image"
```

**Token Detection (Lines 135-143):**
```typescript
const token = localStorage.getItem("admin_token") ||
              localStorage.getItem("mizizzi_token") ||
              localStorage.getItem("token") ||
              localStorage.getItem("access_token")
```

**Upload Request (Lines 159-169):**
```typescript
const response = await fetch(endpoint, {
  method: "POST",
  body: formData,
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
```

### CarouselBannerForm
**File:** `frontend/components/admin/carousel/carousel-banner-form.tsx`

**Integration (Line 104):**
```tsx
<ImageUploader 
  onUpload={handleImageUpload} 
  currentImage={imageUrl} 
  type="carousel"  // Tells component to use carousel endpoint
/>
```

## Authentication Flow

### JWT Token Requirement
1. All `/api/admin/*` routes require JWT authentication
2. Token must be in Authorization header: `Bearer {token}`
3. Backend validates token and admin role

**Backend Validation (admin_upload_routes.py):**
```python
@jwt_required()  # Line 156, 431
def upload_carousel_banner():
    auth_check = admin_required()  # Line 435
    if auth_check:
        return auth_check
```

### Token Storage Keys Checked (in order)
1. `admin_token` - Admin-specific token (preferred)
2. `mizizzi_token` - General user token
3. `token` - Generic token key
4. `access_token` - Standard OAuth key

## Request/Response Format

### Carousel Upload Request
```http
POST /api/admin/upload/carousel-banner HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: multipart/form-data

file: [binary JPEG data]
```

### Carousel Upload Response (Success)
```json
{
  "success": true,
  "url": "/api/uploads/carousel_banners/carousel_abc123def456.jpg",
  "filename": "carousel_abc123def456.jpg",
  "original_size": 2500000,
  "optimized_size": 250000,
  "compression_ratio": "90%",
  "uploadedBy": "admin_user_id_12345",
  "uploadedAt": "2026-03-09T10:23:45.123456"
}
```

### Error Response
```json
{
  "error": "Admin access required",
  "details": "User does not have admin role"
}
```

## CORS Configuration

### Cross-Origin Headers
**Set at:** `admin_upload_routes.py` lines 160-165
```python
@cross_origin()  # Enables CORS
response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
response.headers.add('Access-Control-Allow-Credentials', 'true')
```

## File Structure on Disk

```
backend/
├── app/
│   ├── routes/
│   │   └── admin/
│   │       ├── admin_upload_routes.py     # Upload endpoints
│   │       ├── admin_auth.py              # Auth check functions
│   │       └── ...other routes...
│   └── __init__.py                        # Blueprint registration
│
└── uploads/                               # File storage
    └── carousel_banners/                  # Carousel images
        ├── carousel_uuid1.jpg             # ~250KB each
        ├── carousel_uuid2.jpg
        └── ...
```

## Request Flow Diagram

```
Admin Dashboard (Frontend)
        ↓
CarouselBannerForm
        ↓
ImageUploader (type="carousel")
        ↓
Client-side compression (Canvas API)
        ↓
FormData with JPEG blob
        ↓
POST /api/admin/upload/carousel-banner
        ↓
CORS preflight (OPTIONS)
        ↓
Backend receives POST request
        ↓
JWT validation (@jwt_required)
        ↓
Admin role check (admin_required())
        ↓
File validation (validate_image)
        ↓
PIL optimization (optimize_carousel_image)
        ↓
Save to backend/uploads/carousel_banners/
        ↓
Return JSON response with URL
        ↓
Frontend displays image preview
        ↓
User saves carousel banner
```

## Configuration Summary

| Component | Setting | Value |
|-----------|---------|-------|
| Frontend Endpoint | URL | `/api/admin/upload/carousel-banner` |
| Frontend Compression | Quality | 75% JPEG |
| Frontend Dimensions | Target | 1400x500px |
| Frontend Max Size | Limit | 300KB target |
| Backend Endpoint | Route | `/upload/carousel-banner` |
| Backend URL Prefix | Prefix | `/api/admin` |
| Backend Auth | Method | JWT Bearer |
| Backend Compression | Quality | 75% JPEG |
| Backend Dimensions | Target | 1400x500px |
| Backend Storage | Path | `uploads/carousel_banners/` |
| CORS | Enabled | Yes |
| Token Keys | Checked | admin_token, mizizzi_token, token, access_token |

## Testing the Routes

### Using cURL
```bash
# Get admin token first
TOKEN="your_admin_token_here"

# Upload carousel banner
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@banner.jpg" \
  http://localhost:3000/api/admin/upload/carousel-banner
```

### Using Fetch (Browser Console)
```javascript
const token = localStorage.getItem("admin_token")
const formData = new FormData()
const file = new File([blob], "banner.jpg", { type: "image/jpeg" })
formData.append("file", file)

fetch("/api/admin/upload/carousel-banner", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData
})
.then(r => r.json())
.then(d => console.log("Upload response:", d))
```

## Debugging

### Enable Debug Logs
Add to `admin_upload_routes.py`:
```python
current_app.logger.debug(f"Carousel upload request from: {get_jwt_identity()}")
current_app.logger.debug(f"File size: {file_size}")
current_app.logger.debug(f"Compression ratio: {compression_ratio}%")
```

### Check Request Headers
```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: multipart/form-data; boundary=...
```

### Verify Response
```
Status: 200 OK
Content-Type: application/json
Body: { success: true, url: "...", ... }
```

---

**Last Updated:** March 9, 2026
**Status:** ✅ Complete - All routes configured and tested
