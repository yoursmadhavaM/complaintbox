// Firebase compat initialization (for use with CDN scripts in all HTML files)
const firebaseConfig = {
  apiKey: "AIzaSyA-6DIng7Df8HmbE6KX5e8UxyGCIEPxxEk",
  authDomain: "anonymous-complaint-box.firebaseapp.com",
  projectId: "anonymous-complaint-box",
  messagingSenderId: "573878297184",
  appId: "1:573878297184:web:f5ee4ce9f6b7776e3cd905",
  measurementId: "G-5V8NQ941N9"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Ensure all required Firebase services are available
if (!firebase.firestore) {
  console.error('Firestore is not available. Please check Firebase SDK loading.');
}
if (!firebase.auth) {
  console.error('Firebase Auth is not available. Please check Firebase SDK loading.');
}

// Generate unique token function
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Make generateToken available globally
window.generateToken = generateToken;

// Test Firebase configuration
function testFirebaseConfig() {
  console.log('Testing Firebase configuration...');
  console.log('Firebase config:', firebaseConfig);
  console.log('Firebase app initialized:', firebase.apps.length > 0);
  console.log('Firestore available:', !!db);
  console.log('Auth available:', !!auth);
  
  // Test if we can access Firebase services
  try {
    const testRef = db.collection('test');
    console.log('Firestore connection test:', testRef);
  } catch (error) {
    console.error('Firestore connection error:', error);
  }
  
  // Note about Firebase indexes
  console.log('Note: If you see Firebase index errors, you may need to create composite indexes in the Firebase Console.');
  console.log('For complex queries with multiple where clauses and orderBy, visit: https://console.firebase.google.com/project/anonymous-complaint-box/firestore/indexes');
}

// Run test on page load
document.addEventListener('DOMContentLoaded', function() {
  testFirebaseConfig();
});

// --- Global Functions (defined early to avoid scope issues) ---
let resolveComplaintId = null;

function showResolutionModal(complaintId) {
  resolveComplaintId = complaintId;
  const resolutionDescription = document.getElementById('resolutionDescription');
  const resolutionError = document.getElementById('resolutionError');
  const resolutionModal = document.getElementById('resolutionModal');
  
  if (resolutionDescription) resolutionDescription.value = '';
  if (resolutionError) resolutionError.textContent = '';
  if (resolutionModal) resolutionModal.style.display = 'flex';
}

function hideResolutionModal() {
  resolveComplaintId = null;
  const resolutionModal = document.getElementById('resolutionModal');
  if (resolutionModal) resolutionModal.style.display = 'none';
}

// Utility: Get current page
function getPage() {
  const path = window.location.pathname;
  if (path.endsWith('admin-dashboard.html')) return 'admin';
  if (path.endsWith('dashboard.html')) return 'user';
  if (path.endsWith('index.html') || path === '/' || path === '') return 'index';
  if (path.endsWith('login.html')) return 'login';
  if (path.endsWith('register.html')) return 'register';
  if (path.endsWith('status.html')) return 'status';
  return 'other';
}

// --- Modal Logic (shared) ---

// --- Index (Complaint Submission) Page Logic ---
function setupIndexPage() {
  const authModal = document.getElementById('authModal');
  const complaintForm = document.getElementById('complaintForm');
  const complaintTitle = document.getElementById('complaintTitle');
  const tokenSection = document.getElementById('tokenSection');


  // Welcome modal buttons
  const loginBtn = document.getElementById('loginBtn');
  const anonymousBtn = document.getElementById('anonymousBtn');
  const submitComplaintBtn = document.getElementById('submitComplaintBtn');
  const checkStatusBtn = document.getElementById('checkStatusBtn');
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const cancelComplaintBtn = document.getElementById('cancelComplaintBtn');
  const nameEmailFields = document.getElementById('nameEmailFields');
  const emailFields = document.getElementById('emailFields');

  console.log('Setting up index page buttons...');
  console.log('adminLoginBtn found:', !!adminLoginBtn);
  console.log('checkStatusBtn found:', !!checkStatusBtn);

  if (loginBtn) {
    loginBtn.onclick = function() {
      window.location.href = 'login.html';
    };
  }

  if (anonymousBtn) {
    anonymousBtn.onclick = function() {
      window.location.href = 'anonymous.html';
    };
  }

  if (submitComplaintBtn) {
    submitComplaintBtn.onclick = function() {
      window.location.href = 'complaint.html';
    };
  }

  if (checkStatusBtn) {
    checkStatusBtn.onclick = function() {
      console.log('Check status button clicked');
      const statusModal = document.getElementById('statusModal');
      if (statusModal) {
        statusModal.style.display = 'flex';
      }
    };
  }

  if (adminLoginBtn) {
    adminLoginBtn.onclick = function() {
      console.log('Admin login button clicked');
      window.location.href = 'admin-dashboard.html';
    };
  }

  if (cancelComplaintBtn) {
    cancelComplaintBtn.onclick = function() {
      complaintForm.style.display = 'none';
      complaintTitle.style.display = 'none';
      authModal.style.display = 'block';
    };
  }

  // Complaint form submission
  if (complaintForm) {
    complaintForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const complaintName = document.getElementById('complaintName').value.trim();
      const complaintEmail = document.getElementById('complaintEmail').value.trim();
      const complaintType = document.getElementById('complaintType').value;
      const complaintDescription = document.getElementById('complaintDescription').value;
      const requiredResolution = document.getElementById('requiredResolution').value;
      
      // Check all required fields including name and email
      if (!complaintName || !complaintEmail || !complaintType || !complaintDescription || !requiredResolution) {
        alert('Please fill in all required fields.');
        return;
      }

      try {
        // Generate unique token
        const token = generateToken();
        
        // Save to Firestore with all fields
        await db.collection('complaints').add({
          token: token,
          name: complaintName,
          email: complaintEmail,
          type: complaintType,
          description: complaintDescription,
          requiredResolution: requiredResolution,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          isAnonymous: false
        });

        // Show success message with token
        complaintForm.style.display = 'none';
        complaintTitle.style.display = 'none';
        
        const tokenDisplay = document.getElementById('tokenDisplay');
        if (tokenDisplay) {
          tokenDisplay.textContent = token;
        }
        tokenSection.style.display = 'block';
        
        // Reset form
        complaintForm.reset();
        
      } catch (err) {
        console.error('Error submitting complaint:', err);
        alert('Failed to submit complaint. Please try again.');
      }
    };
  }



  // Status check modal functionality
  const statusModal = document.getElementById('statusModal');
  const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
  const inlineStatusForm = document.getElementById('inlineStatusForm');
  const inlineStatusResult = document.getElementById('inlineStatusResult');

  if (closeStatusModalBtn) {
    closeStatusModalBtn.onclick = function() {
      statusModal.style.display = 'none';
    };
  }

  if (inlineStatusForm) {
    inlineStatusForm.onsubmit = async function(e) {
      e.preventDefault();
      const token = document.getElementById('inlineToken').value.trim();
      
      if (!token) {
        inlineStatusResult.textContent = 'Please enter a complaint token.';
        return;
      }

      inlineStatusResult.textContent = 'Checking status...';
      
      try {
        const querySnapshot = await db.collection('complaints').where('token', '==', token).get();
        if (querySnapshot.empty) {
          inlineStatusResult.textContent = 'No complaint found with this token. Please check your token and try again.';
        } else {
          const complaint = querySnapshot.docs[0].data();
          let resultHtml = `<strong>Status:</strong> ${complaint.status || 'Unknown'}`;
          if (complaint.status === 'resolved' && complaint.resolutionDescription) {
            resultHtml += `<br><strong>Resolution:</strong> ${complaint.resolutionDescription}`;
          }
          inlineStatusResult.innerHTML = resultHtml;
        }
      } catch (err) {
        console.error('Error checking status:', err);
        inlineStatusResult.textContent = 'Error checking status. Please try again.';
      }
    };
  }

  // Close modals when clicking outside
      [statusModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
  });


}

// --- Login Page Logic ---
function setupLoginPage() {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  
  if (loginForm) {
    loginForm.onsubmit = async function(e) {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      
      console.log('Login attempt for email:', email);
      console.log('Password length:', password.length);
      
      if (loginError) loginError.textContent = '';
      
      // Basic validation
      if (!email || !password) {
        if (loginError) loginError.textContent = 'Please enter both email and password.';
        return;
      }
      
      if (!email.includes('@')) {
        if (loginError) loginError.textContent = 'Please enter a valid email address.';
        return;
      }
      
      try {
        console.log('Attempting Firebase authentication...');
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Login successful:', userCredential.user.email);
        window.location.href = 'dashboard.html';
      } catch (err) {
        console.error('Login error:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        
        let errorMessage = 'Login failed: ';
        
        switch (err.code) {
          case 'auth/user-not-found':
            errorMessage += 'No account found with this email address.';
            break;
          case 'auth/wrong-password':
            errorMessage += 'Incorrect password.';
            break;
          case 'auth/invalid-email':
            errorMessage += 'Invalid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage += 'This account has been disabled.';
            break;
          case 'auth/too-many-requests':
            errorMessage += 'Too many failed attempts. Please try again later.';
            break;
          case 'auth/network-request-failed':
            errorMessage += 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage += err.message;
        }
        
        if (loginError) loginError.textContent = errorMessage;
      }
    };
  }
  if (forgotPasswordBtn) {
    forgotPasswordBtn.onclick = async function() {
      const email = document.getElementById('loginEmail').value.trim();
      if (!email) {
        if (loginError) loginError.textContent = 'Please enter your email to reset your password.';
        return;
      }
      try {
        await auth.sendPasswordResetEmail(email);
        if (loginError) {
          loginError.style.color = '#388e3c';
          loginError.textContent = 'Password reset email sent! Check your inbox.';
        }
      } catch (err) {
        if (loginError) {
          loginError.style.color = '#e53935';
          loginError.textContent = 'Error: ' + err.message;
        }
      }
    };
  }
}

// --- Register Page Logic ---
function setupRegisterPage() {
  const registerForm = document.getElementById('registerForm');
  const userTypeSelect = document.getElementById('userType');
  const studentRegdDiv = document.getElementById('studentRegdDiv');
  const studentRegdInput = document.getElementById('studentRegd');
  const facultyIdDiv = document.getElementById('facultyIdDiv');
  const facultyIdInput = document.getElementById('facultyId');
  const parentDiv = document.getElementById('parentDiv');
  const parentContactInput = document.getElementById('parentContact');
  const childNameInput = document.getElementById('childName');
  const childRegdInput = document.getElementById('childRegd');
  const otherDiv = document.getElementById('otherDiv');
  const otherSpecifyInput = document.getElementById('otherSpecify');
  


  // Show/hide fields based on user type
  if (userTypeSelect) {
    userTypeSelect.onchange = function() {
      studentRegdDiv.style.display = 'none';
      facultyIdDiv.style.display = 'none';
      parentDiv.style.display = 'none';
      otherDiv.style.display = 'none';
      studentRegdInput.required = false;
      facultyIdInput.required = false;
      parentContactInput.required = false;
      childNameInput.required = false;
      childRegdInput.required = false;
      otherSpecifyInput.required = false;
      if (this.value === 'student') {
        studentRegdDiv.style.display = 'block';
        studentRegdInput.required = true;
      } else if (this.value === 'faculty') {
        facultyIdDiv.style.display = 'block';
        facultyIdInput.required = true;
      } else if (this.value === 'parent') {
        parentDiv.style.display = 'block';
        parentContactInput.required = true;
        childNameInput.required = true;
        childRegdInput.required = true;
      } else if (this.value === 'other') {
        otherDiv.style.display = 'block';
        otherSpecifyInput.required = true;
      }
    };
  }

  function validateRegistrationNumber(regd) {
    const pattern = /^[LY]\d{2}[A-Z]{2}\d{3}$/;
    if (!pattern.test(regd)) {
      return 'Invalid format. Use: L/Y + 2 digits + 2 letters + 3 digits (e.g., L24CD207)';
    }
    const year = regd.substring(1, 3);
    const branch = regd.substring(3, 5).toUpperCase();
    const validBranches = ['EE', 'CS', 'CD', 'CM', 'CO', 'CHE', 'ME', 'CI', 'AI'];
    if (!validBranches.includes(branch)) {
      return `Invalid branch code. Valid codes: ${validBranches.join(', ')}`;
    }
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const yearNum = parseInt(year);
    const currentYearNum = parseInt(currentYear);
    if (yearNum < 20 || yearNum > currentYearNum + 5) {
      return `Invalid year. Must be between 20 and ${currentYearNum + 5}`;
    }
    return null; // Valid
  }

  if (registerForm) {
    registerForm.onsubmit = async function(e) {
      e.preventDefault();
      const name = document.getElementById('registerName').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const userType = document.getElementById('userType').value;
      const studentRegd = studentRegdInput.value.trim();
      const facultyId = facultyIdInput.value.trim();
      const parentContact = parentContactInput.value.trim();
      const childName = childNameInput.value.trim();
      const childRegd = childRegdInput.value.trim();
      const otherSpecify = otherSpecifyInput.value.trim();
      const password = document.getElementById('registerPassword').value;

      if (!userType) {
        alert('Please select a user type.');
        return;
      }
      // Student validation
      if (userType === 'student') {
        if (!studentRegd) {
          alert('Student registration number is required.');
          return;
        }
        const validationError = validateRegistrationNumber(studentRegd.toUpperCase());
        if (validationError) {
          alert(validationError);
          return;
        }
      }
      // Faculty validation
      if (userType === 'faculty') {
        if (!facultyId) {
          alert('Faculty ID is required.');
          return;
        }
        if (!/^\d{6}$/.test(facultyId)) {
          alert('Faculty ID must be exactly 6 digits.');
          return;
        }
      }
      // Parent validation
      if (userType === 'parent') {
        if (!parentContact || !/^\d{10}$/.test(parentContact)) {
          alert('Contact number must be exactly 10 digits.');
          return;
        }
        if (!childName) {
          alert("Child's name is required.");
          return;
        }
        if (!childRegd) {
          alert("Child's registration number is required.");
          return;
        }
        const validationError = validateRegistrationNumber(childRegd.toUpperCase());
        if (validationError) {
          alert('Child Regd: ' + validationError);
          return;
        }
      }
      // Other validation
      if (userType === 'other') {
        if (!otherSpecify) {
          alert('Please specify who you are.');
          return;
        }
      }
      try {
        console.log('Starting user registration...');
        console.log('Email:', email);
        console.log('Name:', name);
        console.log('User Type:', userType);
        console.log('Password length:', password.length);
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        console.log('User created successfully:', userCredential.user.uid);
        const userData = {
          name,
          email,
          userType,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (userType === 'student') {
          userData.studentRegd = studentRegd.toUpperCase();
        }
        if (userType === 'faculty') {
          userData.facultyId = facultyId;
        }
        if (userType === 'parent') {
          userData.parentContact = parentContact;
          userData.childName = childName;
          userData.childRegd = childRegd.toUpperCase();
        }
        if (userType === 'other') {
          userData.otherSpecify = otherSpecify;
        }
        

        
        await db.collection('users').doc(userCredential.user.uid).set(userData);
        alert(`Welcome, ${name || email}! Your account has been created successfully.`);
        window.location.href = 'dashboard.html';
      } catch (err) {
        console.error('Registration error:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        
        let errorMessage = 'Registration failed: ';
        
        switch (err.code) {
          case 'auth/email-already-in-use':
            errorMessage += 'An account with this email already exists.';
            break;
          case 'auth/invalid-email':
            errorMessage += 'Invalid email address.';
            break;
          case 'auth/weak-password':
            errorMessage += 'Password is too weak. Please use at least 6 characters.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage += 'Email/password accounts are not enabled. Please contact support.';
            break;
          case 'auth/network-request-failed':
            errorMessage += 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage += err.message;
        }
        
        alert(errorMessage);
      }
    };
  }
}

// --- Status Page Logic ---
function setupStatusPage() {
  const statusForm = document.getElementById('statusForm');
  const statusResult = document.getElementById('statusResult');
  const bounceTokenBtn = document.getElementById('bounceTokenBtn');
  const bounceResult = document.getElementById('bounceResult');
  
  if (statusForm) {
    statusForm.onsubmit = async function(e) {
      e.preventDefault();
      const token = document.getElementById('token').value.trim();
      
      if (!token) {
        statusResult.innerHTML = '<span style="color: #f44336;">Please enter a token.</span>';
        return;
      }
      
      statusResult.innerHTML = '<span style="color: #2196f3;">Checking status...</span>';
      
      try {
        const result = await checkComplaintStatus(token);
        
        if (result.success) {
          statusResult.innerHTML = result.message;
          console.log('Status check successful, complaint data:', result.data);
        } else {
          statusResult.innerHTML = `<span style="color: #f44336;">${result.message}</span>`;
          // Hide bounce section if no complaint found
          const bounceSection = document.getElementById('bounceSection');
          if (bounceSection) bounceSection.style.display = 'none';
        }
      } catch (error) {
        console.error('Error checking status:', error);
        statusResult.innerHTML = '<span style="color: #f44336;">Error checking status. Please try again.</span>';
      }
    };
  }
  
  // Bounce token button functionality
  if (bounceTokenBtn) {
    bounceTokenBtn.onclick = async function() {
      console.log('Bounce button clicked');
      
      if (!window.currentComplaintData) {
        bounceResult.innerHTML = '<span style="color: #f44336;">Please check a complaint status first.</span>';
        return;
      }
      
      // Validate complaint data before bouncing
      const complaintData = window.currentComplaintData;
      if (!complaintData.id || !complaintData.status) {
        bounceResult.innerHTML = '<span style="color: #f44336;">Invalid complaint data. Please check status again.</span>';
        return;
      }
      
      const token = complaintData.token || document.getElementById('token').value.trim();
      if (!token) {
        bounceResult.innerHTML = '<span style="color: #f44336;">No valid token found.</span>';
        return;
      }
      
      bounceResult.innerHTML = '<span style="color: #2196f3;">Processing bounce...</span>';
      
      try {
        const success = await bounceToken(token, complaintData);
        
        if (success) {
          bounceResult.innerHTML = '<span style="color: #4caf50;">✓ Token bounced successfully! Admin will review the case.</span>';
          
          // Hide bounce section after successful bounce
          setTimeout(() => {
            const bounceSection = document.getElementById('bounceSection');
            if (bounceSection) bounceSection.style.display = 'none';
            bounceResult.innerHTML = '';
          }, 3000);
        } else {
          bounceResult.innerHTML = '<span style="color: #f44336;">✗ Failed to bounce token. Please try again.</span>';
        }
      } catch (error) {
        console.error('Error bouncing token:', error);
        bounceResult.innerHTML = '<span style="color: #f44336;">Error bouncing token. Please try again.</span>';
      }
    };
  }
}

// --- Dashboard Sidebar Logic (shared) ---
function setupSidebar() {
  const sidebar = document.querySelector('.dashboard-sidebar ul');
  const sections = document.querySelectorAll('.dashboard-section');
  const filterBar = document.getElementById('filterBar');
  
  if (sidebar && sections.length) {
    sidebar.addEventListener('click', function(e) {
      const li = e.target.closest('li[data-section]');
      if (!li) return;
      
      sidebar.querySelectorAll('li').forEach(item => item.classList.remove('active'));
      li.classList.add('active');
      
      // Show/hide filter bar based on section
      const sectionName = li.dataset.section;
      if (filterBar) {
        if (sectionName === 'complaints') {
          filterBar.style.display = 'block';
        } else {
          filterBar.style.display = 'none';
        }
      }
      
      sections.forEach(section => {
        section.style.display = section.id === li.dataset.section + 'Section' ? 'block' : 'none';
      });
      
      // Load section-specific data
      if (sectionName === 'tokens') {
        loadAdminTokens();
      } else if (sectionName === 'resolved') {
        loadAdminResolvedComplaints();
      } else if (sectionName === 'bouncedComplaints') {
        loadBouncedComplaints();
      } else if (sectionName === 'statistics') {
        loadAdminStatistics();
      }
    });
  }
}

// --- User Dashboard Logic ---
function setupUserDashboard() {
  // Auth check and user info
  auth.onAuthStateChanged(async function(user) {
    if (user) {
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        const userData = doc.exists ? doc.data() : {};
        const name = userData.name || user.email;
        const userType = userData.userType || 'User';
        
        // Update user greeting and type
        const userGreeting = document.getElementById('userGreeting');
        const userTypeElement = document.getElementById('userType');
        if (userGreeting) userGreeting.textContent = `Welcome, ${name}!`;
        if (userTypeElement) userTypeElement.textContent = userType;
        
        // Update user avatar (profile pictures removed)
        const userAvatar = document.getElementById('userAvatarBtn');
        if (userAvatar) {
          userAvatar.innerHTML = '<i class="fas fa-user-circle"></i>';
        }
        
        // Load user data
        loadUserStats(user.uid);
        loadUserComplaints(user.uid);
        loadUserProfile(user.uid, userData);
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    } else {
      window.location.href = 'login.html';
    }
  });

  // Logout functionality
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = function() {
      auth.signOut().then(() => {
        alert('You have been logged out successfully.');
        window.location.href = 'index.html';
      });
    };
  }

  // Action buttons
  setupActionButtons();
  
  // Modals
  setupModals();
  
  // Filter buttons
  setupFilterButtons();
  
  // User dropdown menu
  setupUserDropdown();
  
  // Profile settings
  setupProfileSettings();
  

}

// Load user statistics
async function loadUserStats(userId) {
  try {
    const complaintsSnapshot = await db.collection('complaints')
      .where('email', '==', auth.currentUser.email)
      .get();
    
    const complaints = complaintsSnapshot.docs.map(doc => doc.data());
    const pending = complaints.filter(c => c.status === 'pending').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const total = complaints.length;
    const tokens = complaints.length; // Each complaint has a token
    
    // Update stats cards
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('resolvedCount').textContent = resolved;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('tokenCount').textContent = tokens;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// Load user complaints
async function loadUserComplaints(userId) {
  const complaintsList = document.getElementById('complaintsList');
  if (!complaintsList) return;
  
  try {
    const snapshot = await db.collection('complaints')
      .where('email', '==', auth.currentUser.email)
      .get();
    
    if (snapshot.empty) {
      complaintsList.innerHTML = '<div class="no-data">No complaints submitted yet.</div>';
      return;
    }
    
    const complaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort by createdAt in descending order (newest first) in JavaScript
    complaints.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.toDate() - a.createdAt.toDate();
    });
    
    renderComplaints(complaints);
  } catch (err) {
    complaintsList.innerHTML = '<div class="error">Failed to load complaints.</div>';
    console.error('Error loading complaints:', err);
  }
}

// Render complaints in grid
function renderComplaints(complaints) {
  const complaintsList = document.getElementById('complaintsList');
  if (!complaintsList) return;
  
  complaintsList.innerHTML = complaints.map(complaint => `
    <div class="complaint-item">
      <div class="complaint-header">
        <span class="complaint-type">${complaint.complaintType}</span>
        <span class="complaint-status ${complaint.status}">${complaint.status}</span>
      </div>
      <div class="complaint-description">${complaint.description}</div>
      <div class="complaint-footer">
        <span class="complaint-token">${complaint.token}</span>
        <span>${complaint.createdAt ? new Date(complaint.createdAt.toDate()).toLocaleDateString() : 'N/A'}</span>
      </div>
      ${complaint.status === 'resolved' && complaint.resolutionDescription ? 
        `<div class="resolution-info">
          <strong>Resolution:</strong> ${complaint.resolutionDescription}
        </div>` : ''
      }
    </div>
  `).join('');
}

// Load user profile
async function loadUserProfile(userId, userData) {
  const profileInfo = document.getElementById('profileInfo');
  if (!profileInfo) return;
  
  profileInfo.innerHTML = `
    <div class="profile-info">
      <div class="profile-field">
        <span class="profile-label">Name:</span>
        <span class="profile-value">${userData.name || 'Not provided'}</span>
      </div>
      <div class="profile-field">
        <span class="profile-label">Email:</span>
        <span class="profile-value">${auth.currentUser.email}</span>
      </div>
      <div class="profile-field">
        <span class="profile-label">User Type:</span>
        <span class="profile-value">${userData.userType || 'Not specified'}</span>
      </div>
      ${userData.studentRegd ? `
        <div class="profile-field">
          <span class="profile-label">Registration Number:</span>
          <span class="profile-value">${userData.studentRegd}</span>
        </div>
      ` : ''}
      ${userData.facultyId ? `
        <div class="profile-field">
          <span class="profile-label">Faculty ID:</span>
          <span class="profile-value">${userData.facultyId}</span>
        </div>
      ` : ''}
      ${userData.parentContact ? `
        <div class="profile-field">
          <span class="profile-label">Contact:</span>
          <span class="profile-value">${userData.parentContact}</span>
        </div>
        <div class="profile-field">
          <span class="profile-label">Child Name:</span>
          <span class="profile-value">${userData.childName || 'Not provided'}</span>
        </div>
        <div class="profile-field">
          <span class="profile-label">Child Registration:</span>
          <span class="profile-value">${userData.childRegd || 'Not provided'}</span>
        </div>
      ` : ''}
      ${userData.otherSpecify ? `
        <div class="profile-field">
          <span class="profile-label">User Category:</span>
          <span class="profile-value">${userData.otherSpecify}</span>
        </div>
      ` : ''}
    </div>
  `;
}

// Setup action buttons
function setupActionButtons() {
  const newComplaintBtn = document.getElementById('newComplaintBtn');
  const checkStatusBtn = document.getElementById('checkStatusBtn');
  if (newComplaintBtn) {
    newComplaintBtn.onclick = function() {
      document.getElementById('newComplaintModal').style.display = 'flex';
    };
  }
  
  if (checkStatusBtn) {
    checkStatusBtn.onclick = function() {
      document.getElementById('statusCheckModal').style.display = 'flex';
    };
  }
}

// Setup modals
function setupModals() {
  // New Complaint Modal
  const newComplaintModal = document.getElementById('newComplaintModal');
  const closeNewComplaintModal = document.getElementById('closeNewComplaintModal');
  const newComplaintForm = document.getElementById('newComplaintForm');
  const cancelComplaintBtn = document.getElementById('cancelComplaintBtn');
  
  if (closeNewComplaintModal) {
    closeNewComplaintModal.onclick = function() {
      newComplaintModal.style.display = 'none';
    };
  }
  
  if (cancelComplaintBtn) {
    cancelComplaintBtn.onclick = function() {
      newComplaintModal.style.display = 'none';
    };
  }
  
  if (newComplaintForm) {
    newComplaintForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const complaintType = document.getElementById('complaintType').value;
      const description = document.getElementById('complaintDescription').value.trim();
      const requirement = document.getElementById('complaintRequirement').value;
      const otherRequirement = document.getElementById('otherRequirement').value.trim();
      
      const token = 'C-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const complaintData = {
        name: auth.currentUser.displayName || auth.currentUser.email,
        email: auth.currentUser.email,
        complaintType,
        description,
        requirement: requirement === 'Other' ? otherRequirement : requirement,
        isAnonymous: false,
        token,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      try {
        await db.collection('complaints').add(complaintData);
        alert(`Complaint submitted successfully! Your token is: ${token}`);
        newComplaintModal.style.display = 'none';
        newComplaintForm.reset();
        loadUserStats(auth.currentUser.uid);
        loadUserComplaints(auth.currentUser.uid);
      } catch (err) {
        alert('Failed to submit complaint. Please try again.');
      }
    };
  }
  
  // Status Check Modal
  const statusCheckModal = document.getElementById('statusCheckModal');
  const closeStatusCheckModal = document.getElementById('closeStatusCheckModal');
  const statusCheckForm = document.getElementById('statusCheckForm');
  const cancelStatusBtn = document.getElementById('cancelStatusBtn');
  
  if (closeStatusCheckModal) {
    closeStatusCheckModal.onclick = function() {
      statusCheckModal.style.display = 'none';
    };
  }
  
  if (cancelStatusBtn) {
    cancelStatusBtn.onclick = function() {
      statusCheckModal.style.display = 'none';
    };
  }
  
  if (statusCheckForm) {
    statusCheckForm.onsubmit = async function(e) {
      e.preventDefault();
      const token = document.getElementById('statusToken').value.trim();
      const statusResult = document.getElementById('statusResult');
      
      statusResult.textContent = 'Checking...';
      
      try {
        const querySnapshot = await db.collection('complaints').where('token', '==', token).get();
        if (querySnapshot.empty) {
          statusResult.textContent = 'No complaint found with this token.';
        } else {
          const complaint = querySnapshot.docs[0].data();
          let resultHtml = `<strong>Status:</strong> ${complaint.status || 'Unknown'}`;
          if (complaint.status === 'resolved' && complaint.resolutionDescription) {
            resultHtml += `<br><strong>Resolution:</strong> ${complaint.resolutionDescription}`;
          }
          statusResult.innerHTML = resultHtml;
        }
      } catch (err) {
        statusResult.textContent = 'Error checking status. Please try again.';
      }
    };
  }
  

  
  // Close modals when clicking outside
  [newComplaintModal, statusCheckModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
  });
}

// Setup filter buttons
function setupFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.onclick = function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      // TODO: Implement filtering logic
    };
  });
}

// Setup user dropdown menu
function setupUserDropdown() {
  const userAvatarBtn = document.getElementById('userAvatarBtn');
  const userDropdown = document.getElementById('userDropdown');
  const profileSettingsBtn = document.getElementById('profileSettingsBtn');
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');
  
  // Toggle dropdown on avatar click
  if (userAvatarBtn && userDropdown) {
    userAvatarBtn.onclick = function(e) {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    };
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (userDropdown && !userDropdown.contains(e.target) && !userAvatarBtn.contains(e.target)) {
      userDropdown.classList.remove('show');
    }
  });
  
  // Profile settings
  if (profileSettingsBtn) {
    profileSettingsBtn.onclick = function() {
      userDropdown.classList.remove('show');
      openProfileSettings();
    };
  }
  
  // Change password
  if (changePasswordBtn) {
    changePasswordBtn.onclick = function() {
      userDropdown.classList.remove('show');
      document.getElementById('changePasswordModal').style.display = 'flex';
    };
  }
  
  // Logout from dropdown
  if (logoutDropdownBtn) {
    logoutDropdownBtn.onclick = function() {
      userDropdown.classList.remove('show');
      auth.signOut().then(() => {
        alert('You have been logged out successfully.');
        window.location.href = 'index.html';
      });
    };
  }
}

// Setup profile settings
function setupProfileSettings() {
  const profileSettingsModal = document.getElementById('profileSettingsModal');
  const closeProfileSettingsModal = document.getElementById('closeProfileSettingsModal');
  const profileSettingsForm = document.getElementById('profileSettingsForm');
  const cancelProfileBtn = document.getElementById('cancelProfileBtn');
  const changePasswordModal = document.getElementById('changePasswordModal');
  const closeChangePasswordModal = document.getElementById('closeChangePasswordModal');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
  
  // Close profile settings modal
  if (closeProfileSettingsModal) {
    closeProfileSettingsModal.onclick = function() {
      profileSettingsModal.style.display = 'none';
    };
  }
  
  if (cancelProfileBtn) {
    cancelProfileBtn.onclick = function() {
      profileSettingsModal.style.display = 'none';
    };
  }
  
  // Close change password modal
  if (closeChangePasswordModal) {
    closeChangePasswordModal.onclick = function() {
      changePasswordModal.style.display = 'none';
    };
  }
  
  if (cancelPasswordBtn) {
    cancelPasswordBtn.onclick = function() {
      changePasswordModal.style.display = 'none';
    };
  }
  
  // Profile settings form submission
  if (profileSettingsForm) {
    profileSettingsForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const resultElement = document.getElementById('profileSettingsResult');
      const userId = auth.currentUser.uid;
      
      try {
        const updateData = {
          name: document.getElementById('profileName').value.trim()
        };
        
        // Add user type specific fields
        const userType = document.getElementById('profileUserType').value;
        if (userType === 'parent') {
          updateData.parentContact = document.getElementById('profileParentContact').value.trim();
          updateData.childName = document.getElementById('profileChildName').value.trim();
          updateData.childRegd = document.getElementById('profileChildRegd').value.trim();
        } else if (userType === 'other') {
          updateData.otherSpecify = document.getElementById('profileOtherSpecify').value.trim();
        }
        
        await db.collection('users').doc(userId).update(updateData);
        
        resultElement.textContent = 'Profile updated successfully!';
        resultElement.className = 'result-message success';
        
        // Update the greeting in the top nav
        const userGreeting = document.getElementById('userGreeting');
        if (userGreeting) {
          userGreeting.textContent = `Welcome, ${updateData.name}!`;
        }
        
        setTimeout(() => {
          profileSettingsModal.style.display = 'none';
        }, 1500);
        
      } catch (err) {
        resultElement.textContent = 'Failed to update profile. Please try again.';
        resultElement.className = 'result-message error';
      }
    };
  }
  
  // Change password form submission
  if (changePasswordForm) {
    changePasswordForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const resultElement = document.getElementById('changePasswordResult');
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      if (newPassword !== confirmPassword) {
        resultElement.textContent = 'New passwords do not match.';
        resultElement.className = 'result-message error';
        return;
      }
      
      if (newPassword.length < 6) {
        resultElement.textContent = 'Password must be at least 6 characters long.';
        resultElement.className = 'result-message error';
        return;
      }
      
      try {
        const user = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
        
        resultElement.textContent = 'Password changed successfully!';
        resultElement.className = 'result-message success';
        
        setTimeout(() => {
          changePasswordModal.style.display = 'none';
          changePasswordForm.reset();
        }, 1500);
        
      } catch (err) {
        if (err.code === 'auth/wrong-password') {
          resultElement.textContent = 'Current password is incorrect.';
        } else {
          resultElement.textContent = 'Failed to change password. Please try again.';
        }
        resultElement.className = 'result-message error';
      }
    };
  }
  
  // Close modals when clicking outside
  [profileSettingsModal, changePasswordModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
  });
}

// Open profile settings modal with user data
async function openProfileSettings() {
  const modal = document.getElementById('profileSettingsModal');
  if (!modal) return;
  
  try {
    const userId = auth.currentUser.uid;
    const doc = await db.collection('users').doc(userId).get();
    const userData = doc.exists ? doc.data() : {};
    
    // Populate form fields
    document.getElementById('profileName').value = userData.name || '';
    document.getElementById('profileEmail').value = auth.currentUser.email || '';
    document.getElementById('profileUserType').value = userData.userType || '';
    
    // Hide all user type specific fields
    document.getElementById('profileStudentFields').style.display = 'none';
    document.getElementById('profileFacultyFields').style.display = 'none';
    document.getElementById('profileParentFields').style.display = 'none';
    document.getElementById('profileOtherFields').style.display = 'none';
    
    // Show relevant fields based on user type
    if (userData.userType === 'student') {
      document.getElementById('profileStudentFields').style.display = 'block';
      document.getElementById('profileStudentRegd').value = userData.studentRegd || '';
    } else if (userData.userType === 'faculty') {
      document.getElementById('profileFacultyFields').style.display = 'block';
      document.getElementById('profileFacultyId').value = userData.facultyId || '';
    } else if (userData.userType === 'parent') {
      document.getElementById('profileParentFields').style.display = 'block';
      document.getElementById('profileParentContact').value = userData.parentContact || '';
      document.getElementById('profileChildName').value = userData.childName || '';
      document.getElementById('profileChildRegd').value = userData.childRegd || '';
    } else if (userData.userType === 'other') {
      document.getElementById('profileOtherFields').style.display = 'block';
      document.getElementById('profileOtherSpecify').value = userData.otherSpecify || '';
    }
    
    // Clear any previous result messages
    const resultElement = document.getElementById('profileSettingsResult');
    if (resultElement) {
      resultElement.textContent = '';
      resultElement.className = '';
    }
    
    modal.style.display = 'flex';
    
  } catch (err) {
    console.error('Error loading profile data:', err);
    alert('Failed to load profile data. Please try again.');
  }
}



// --- Admin: Load Complaints ---
async function loadAdminComplaints() {
  const tableBody = document.getElementById('complaintsTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="6">Loading complaints...</td></tr>';
  try {
    const snapshot = await db.collection('complaints')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="6">No pending complaints.</td></tr>';
      return;
    }
    tableBody.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${doc.id}</td>
        <td>${data.complaintType || ''}</td>
        <td>${data.status || ''}</td>
        <td>${data.isAnonymous ? 'Anonymous' : (data.name || data.email || data.token || '')}</td>
        <td>${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}</td>
        <td>
          <button class='btn-view'>View</button>
          <button class='btn-resolve'>Resolve</button>
          <button class='btn-delete'>Delete</button>
        </td>
      `;
      // View button
      tr.querySelector('.btn-view').onclick = function() {
        showComplaintDetails(doc.id, data);
      };
      // Resolve button
      tr.querySelector('.btn-resolve').onclick = function() {
        showResolutionModal(doc.id);
      };
      // Delete button
      tr.querySelector('.btn-delete').onclick = async function() {
        try {
          // Check if user is authenticated
          const user = auth.currentUser;
          if (!user) {
            alert('Please log in to perform this action.');
            return;
          }
          
          await db.collection('complaints').doc(doc.id).delete();
          loadAdminComplaints();
        } catch (error) {
          console.error('Error deleting complaint:', error);
          alert('Failed to delete complaint. Please try again.');
        }
      };
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load complaints:', err);
    tableBody.innerHTML = '<tr><td colspan="6">Failed to load complaints.</td></tr>';
  }
}

// --- Admin: Load Resolved Complaints ---
async function loadAdminResolvedComplaints() {
  const tableBody = document.getElementById('resolvedComplaintsTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="6">Loading resolved complaints...</td></tr>';
  try {
    const snapshot = await db.collection('complaints')
      .where('status', '==', 'resolved')
      .orderBy('createdAt', 'desc')
      .get();
    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="6">No resolved complaints.</td></tr>';
      return;
    }
    tableBody.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${doc.id}</td>
        <td>${data.complaintType || ''}</td>
        <td>${data.status || ''}</td>
        <td>${data.isAnonymous ? 'Anonymous' : (data.name || data.email || data.token || '')}</td>
        <td>${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}</td>
        <td>
          <button class='btn-view'>View</button>
          <button class='btn-delete'>Delete</button>
        </td>
      `;
      // View button
      tr.querySelector('.btn-view').onclick = function() {
        showComplaintDetails(doc.id, data);
      };
      // Delete button
      tr.querySelector('.btn-delete').onclick = async function() {
        await db.collection('complaints').doc(doc.id).delete();
        loadAdminResolvedComplaints();
      };
      tableBody.appendChild(tr);
    });
  } catch (err) {
    tableBody.innerHTML = '<tr><td colspan="6">Failed to load resolved complaints.</td></tr>';
  }
}

// --- Admin: Filter and Load Complaints with Filters ---
async function loadAdminComplaintsWithFilters() {
  const statusFilter = document.getElementById('filterStatus')?.value || '';
  const typeFilter = document.getElementById('filterType')?.value || '';
  const dateRangeFilter = document.getElementById('filterDateRange')?.value || '';
  const dateFrom = document.getElementById('filterDateFrom')?.value || '';
  const dateTo = document.getElementById('filterDateTo')?.value || '';

  try {
    console.log('🔍 Applying filters:', { statusFilter, typeFilter, dateRangeFilter, dateFrom, dateTo });
    
    // Start with a basic query - just get all complaints
    let query = db.collection('complaints');
    
    // Apply status filter if specified
    if (statusFilter) {
      query = query.where('status', '==', statusFilter);
      console.log('✅ Applied status filter:', statusFilter);
    }

    // Get the snapshot
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const tableBody = document.getElementById('complaintsTableBody');
    if (!tableBody) {
      console.error('❌ Complaints table body not found');
      return;
    }

    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No complaints found.</td></tr>';
      console.log('ℹ️ No complaints found in database');
      return;
    }

    // Filter the results in JavaScript to avoid complex Firestore queries
    let filteredDocs = snapshot.docs;
    console.log(`📊 Total complaints before filtering: ${filteredDocs.length}`);
    
    // Apply type filter in JavaScript
    if (typeFilter) {
      filteredDocs = filteredDocs.filter(doc => {
        const data = doc.data();
        return data.complaintType === typeFilter;
      });
      console.log(`✅ Applied type filter: ${typeFilter}, remaining: ${filteredDocs.length}`);
    }

    // Apply date filters in JavaScript
    if (dateRangeFilter && dateRangeFilter !== 'custom') {
      const now = new Date();
      let startDate = new Date();
      
      switch (dateRangeFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate.setDate(now.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      if (dateRangeFilter !== 'all') {
        filteredDocs = filteredDocs.filter(doc => {
          const data = doc.data();
          if (data.createdAt) {
            const complaintDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            return complaintDate >= startDate;
          }
          return false;
        });
        console.log(`✅ Applied date filter: ${dateRangeFilter}, remaining: ${filteredDocs.length}`);
      }
    } else if (dateRangeFilter === 'custom' && dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      
      filteredDocs = filteredDocs.filter(doc => {
        const data = doc.data();
        if (data.createdAt) {
          const complaintDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          return complaintDate >= fromDate && complaintDate <= toDate;
        }
        return false;
      });
      console.log(`✅ Applied custom date filter: ${dateFrom} to ${dateTo}, remaining: ${filteredDocs.length}`);
    }

    // Display filtered results
    if (filteredDocs.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No complaints found with the selected filters.</td></tr>';
      console.log('ℹ️ No complaints match the applied filters');
      return;
    }

    tableBody.innerHTML = '';
    filteredDocs.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #dee2e6';
      
      // Format the date properly
      let dateDisplay = '';
      if (data.createdAt) {
        const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        dateDisplay = date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Get user display name
      let userDisplay = '';
      if (data.isAnonymous) {
        userDisplay = 'Anonymous';
      } else if (data.name) {
        userDisplay = data.name;
      } else if (data.email) {
        userDisplay = data.email;
      } else if (data.token) {
        userDisplay = `Token: ${data.token}`;
      } else {
        userDisplay = 'Unknown';
      }
      
      tr.innerHTML = `
        <td style="padding: 12px; font-weight: 600; color: #495057;">${doc.id}</td>
        <td style="padding: 12px;">
          <span style="background: ${getComplaintTypeColor(data.complaintType)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">
            ${data.complaintType || 'Unknown'}
          </span>
        </td>
        <td style="padding: 12px;">
          <span style="background: ${getStatusColor(data.status)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">
            ${data.status || 'Unknown'}
          </span>
        </td>
        <td style="padding: 12px; color: #495057;">${userDisplay}</td>
        <td style="padding: 12px; color: #6c757d; font-size: 0.9rem;">${dateDisplay}</td>
        <td style="padding: 12px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class='btn-view' style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">View</button>
            <button class='btn-resolve' style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Resolve</button>
            <button class='btn-delete' style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Delete</button>
          </div>
        </td>
      `;
      
      // Add event handlers for buttons
      const viewBtn = tr.querySelector('.btn-view');
      const resolveBtn = tr.querySelector('.btn-resolve');
      const deleteBtn = tr.querySelector('.btn-delete');
      
      if (viewBtn) {
        viewBtn.onclick = function() {
          showComplaintDetails(doc.id, data);
        };
      }
      
      if (resolveBtn) {
        resolveBtn.onclick = function() {
          showResolutionModal(doc.id);
        };
      }
      
      if (deleteBtn) {
        deleteBtn.onclick = async function() {
          try {
            const user = auth.currentUser;
            if (!user) {
              alert('Please log in to perform this action.');
              return;
            }
            
            if (confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
              await db.collection('complaints').doc(doc.id).delete();
              console.log('✅ Complaint deleted successfully');
              loadAdminComplaintsWithFilters();
            }
          } catch (error) {
            console.error('❌ Error deleting complaint:', error);
            alert('Failed to delete complaint. Please try again.');
          }
        };
      }
      
      tableBody.appendChild(tr);
    });
    
    console.log(`✅ Displayed ${filteredDocs.length} filtered complaints`);
    
  } catch (error) {
    console.error('❌ Error loading complaints with filters:', error);
    const tableBody = document.getElementById('complaintsTableBody');
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #dc3545;">Error loading complaints. Please try again.</td></tr>';
    }
  }
}

// Helper function to get complaint type color
function getComplaintTypeColor(type) {
  const colors = {
    'academic': '#007bff',
    'infrastructure': '#28a745',
    'faculty': '#ffc107',
    'hostel': '#17a2b8',
    'transportation': '#6f42c1',
    'canteen': '#fd7e14',
    'library': '#20c997',
    'sports': '#e83e8c',
    'other': '#6c757d'
  };
  return colors[type] || '#6c757d';
}

// Helper function to get status color
function getStatusColor(status) {
  const colors = {
    'pending': '#ffc107',
    'resolved': '#28a745',
    'bounced': '#dc3545',
    'overdue': '#fd7e14'
  };
  return colors[status] || '#6c757d';
}

// --- Admin: Load Statistics ---
async function loadAdminStatistics() {
  try {
    // Load summary statistics
    const totalSnapshot = await db.collection('complaints').get();
    const pendingSnapshot = await db.collection('complaints').where('status', '==', 'pending').get();
    const resolvedSnapshot = await db.collection('complaints').where('status', '==', 'resolved').get();

    const total = totalSnapshot ? totalSnapshot.size : 0;
    const pending = pendingSnapshot ? pendingSnapshot.size : 0;
    const resolved = resolvedSnapshot ? resolvedSnapshot.size : 0;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Update summary cards - check if elements exist first
    const totalElement = document.getElementById('totalComplaints');
    const pendingElement = document.getElementById('pendingComplaints');
    const resolvedElement = document.getElementById('resolvedComplaints');
    const rateElement = document.getElementById('resolutionRate');

    if (totalElement) totalElement.textContent = total;
    if (pendingElement) pendingElement.textContent = pending;
    if (resolvedElement) resolvedElement.textContent = resolved;
    if (rateElement) rateElement.textContent = resolutionRate + '%';

  } catch (err) {
    console.error('Failed to load statistics:', err);
    // Set default values if loading fails
    const totalElement = document.getElementById('totalComplaints');
    const pendingElement = document.getElementById('pendingComplaints');
    const resolvedElement = document.getElementById('resolvedComplaints');
    const rateElement = document.getElementById('resolutionRate');

    if (totalElement) totalElement.textContent = '0';
    if (pendingElement) pendingElement.textContent = '0';
    if (resolvedElement) resolvedElement.textContent = '0';
    if (rateElement) rateElement.textContent = '0%';
  }
}







// --- Admin: Generate Reports ---
async function generateReport() {
  const reportType = document.getElementById('reportType').value;
  const reportPeriod = document.getElementById('reportPeriod').value;
  const dateFrom = document.getElementById('reportDateFrom').value;
  const dateTo = document.getElementById('reportDateTo').value;

  let query = db.collection('complaints');
  let startDate = new Date();
  let endDate = new Date();

  // Set date range based on period
  switch (reportPeriod) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'custom':
      if (dateFrom && dateTo) {
        startDate = new Date(dateFrom);
        endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
      }
      break;
  }

  try {
    const snapshot = await query
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .orderBy('createdAt', 'desc')
      .get();

    const reportContent = document.getElementById('reportContent');
    const reportResults = document.getElementById('reportResults');
    
    if (!reportContent || !reportResults) return;

    let reportHTML = '';

    switch (reportType) {
      case 'summary':
        reportHTML = generateSummaryReport(snapshot, startDate, endDate);
        break;
      case 'detailed':
        reportHTML = generateDetailedReport(snapshot, startDate, endDate);
        break;
      case 'typewise':
        reportHTML = generateTypewiseReport(snapshot, startDate, endDate);
        break;
      case 'timeline':
        reportHTML = generateTimelineReport(snapshot, startDate, endDate);
        break;
    }

    reportContent.innerHTML = reportHTML;
    reportResults.style.display = 'block';

  } catch (err) {
    console.error('Failed to generate report:', err);
    alert('Failed to generate report. Please try again.');
  }
}

// --- Admin: Generate Summary Report ---
function generateSummaryReport(snapshot, startDate, endDate) {
  const total = snapshot.size;
  const pending = snapshot.docs.filter(doc => doc.data().status === 'pending').length;
  const resolved = snapshot.docs.filter(doc => doc.data().status === 'resolved').length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
      <h4>Summary Report (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px;">
        <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
          <h3 style="margin: 0; color: #667eea;">${total}</h3>
          <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Total Complaints</p>
        </div>
        <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
          <h3 style="margin: 0; color: #f093fb;">${pending}</h3>
          <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Pending</p>
        </div>
        <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
          <h3 style="margin: 0; color: #4facfe;">${resolved}</h3>
          <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Resolved</p>
        </div>
        <div style="text-align: center; padding: 15px; background: white; border-radius: 8px;">
          <h3 style="margin: 0; color: #43e97b;">${resolutionRate}%</h3>
          <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Resolution Rate</p>
        </div>
      </div>
    </div>
  `;
}

// --- Admin: Generate Detailed Report ---
function generateDetailedReport(snapshot, startDate, endDate) {
  let html = `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
      <h4>Detailed Report (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})</h4>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background: white; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #667eea; color: white;">
            <th style="padding: 12px; text-align: left;">ID</th>
            <th style="padding: 12px; text-align: left;">Type</th>
            <th style="padding: 12px; text-align: left;">Status</th>
            <th style="padding: 12px; text-align: left;">User/Token</th>
            <th style="padding: 12px; text-align: left;">Date</th>
          </tr>
        </thead>
        <tbody>
  `;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const date = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : '';
    const user = data.isAnonymous ? 'Anonymous' : (data.name || data.email || data.token || '');
    
    html += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px;">${doc.id}</td>
        <td style="padding: 12px;">${data.complaintType || ''}</td>
        <td style="padding: 12px;">
          <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; 
            background: ${data.status === 'resolved' ? '#43e97b' : '#f093fb'}; 
            color: white;">
            ${data.status || ''}
          </span>
        </td>
        <td style="padding: 12px;">${user}</td>
        <td style="padding: 12px;">${date}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

// --- Admin: Generate Typewise Report ---
function generateTypewiseReport(snapshot, startDate, endDate) {
  const typeStats = {};
  snapshot.docs.forEach(doc => {
    const type = doc.data().complaintType || 'Other';
    typeStats[type] = (typeStats[type] || 0) + 1;
  });

  let html = `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
      <h4>Type-wise Analysis (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
  `;

  Object.entries(typeStats).forEach(([type, count]) => {
    const percentage = Math.round((count / snapshot.size) * 100);
    html += `
      <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
        <h3 style="margin: 0; color: #667eea;">${count}</h3>
        <p style="margin: 5px 0 0 0; font-size: 0.9rem;">${type}</p>
        <p style="margin: 5px 0 0 0; font-size: 0.8rem; color: #666;">${percentage}% of total</p>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  return html;
}

// --- Admin: Generate Timeline Report ---
function generateTimelineReport(snapshot, startDate, endDate) {
  const timelineStats = {};
  const now = new Date();
  
  // Create timeline buckets
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    timelineStats[monthKey] = 0;
  }

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.createdAt) {
      const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (timelineStats[monthKey] !== undefined) {
        timelineStats[monthKey]++;
      }
    }
  });

  let html = `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
      <h4>Timeline Analysis (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})</h4>
      <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 15px;">
        <canvas id="reportTimelineChart" width="400" height="200"></canvas>
      </div>
    </div>
  `;

  // Note: Charts removed from Visual Analytics section
  // Timeline data available in timelineStats object

  return html;
}

// --- Admin: Show Complaint Details Modal ---
function showComplaintDetails(id, data) {
  const modal = document.getElementById('detailsModal');
  const content = document.getElementById('detailsContent');
  if (!modal || !content) return;
  content.innerHTML = `<b>ID:</b> ${id}<br>
    <b>Type:</b> ${data.complaintType || ''}<br>
    <b>Status:</b> ${data.status || ''}<br>
    <b>User/Token:</b> ${data.isAnonymous ? 'Anonymous' : (data.name || data.email || data.token || '')}<br>
    <b>Date:</b> ${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}<br>
    <b>Description:</b> ${data.description || ''}<br>
    <b>Requirement:</b> ${data.requirement || ''}<br>
    <b>Resolution Description:</b> ${data.resolutionDescription || ''}<br>`;
  modal.style.display = 'flex';
  document.getElementById('closeDetailsModalBtn').onclick = function() {
    modal.style.display = 'none';
  };
}

// --- Admin: Resolution Modal Functions ---

// --- Admin Dashboard Logic ---
function setupAdminDashboard() {
  console.log('Setting up admin dashboard...');
  
  // Load admin data directly without authentication
  console.log('✅ Loading admin dashboard...');
  
  setupSidebar();
  loadAdminComplaints();
  loadAdminResolvedComplaints();
  loadAdminTokens();
  loadBouncedComplaints();

  // Show dashboard on button click
  const adminWelcomeModal = document.getElementById('adminWelcomeModal');
  const adminEnterBtn = document.getElementById('adminEnterBtn');
  const dashboardContainer = document.querySelector('.dashboard-container');
  if (adminWelcomeModal && adminEnterBtn && dashboardContainer) {
    adminEnterBtn.onclick = function() {
      adminWelcomeModal.style.display = 'none';
      dashboardContainer.style.display = 'block';
    };
  }
  
  // Setup resolution modal
  const resolutionForm = document.getElementById('resolutionForm');
  const cancelResolutionBtn = document.getElementById('cancelResolutionBtn');
  if (resolutionForm) {
    resolutionForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const desc = document.getElementById('resolutionDescription').value.trim();
      if (!desc) {
        document.getElementById('resolutionError').textContent = 'Resolution description is required!';
        return;
      }
      if (!resolveComplaintId) return;
      
      try {
        console.log('🔄 Resolving complaint...');
        
        // Update complaint status
        await db.collection('complaints').doc(resolveComplaintId).update({ 
          status: 'resolved', 
          resolutionDescription: desc,
          resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
          resolvedBy: 'admin'
        });
        
        hideResolutionModal();
        loadAdminComplaints();
        loadAdminResolvedComplaints();
        loadAdminTokens();
        loadBouncedComplaints();
      } catch (error) {
        console.error('Error resolving complaint:', error);
        document.getElementById('resolutionError').textContent = 'Failed to resolve complaint. Please try again.';
      }
    };
  }
  if (cancelResolutionBtn) {
    cancelResolutionBtn.onclick = function() {
      hideResolutionModal();
    };
  }

  // Setup filter functionality
  setupAdminFilters();
  
  // Setup statistics functionality
  setupAdminStatistics();
  
  // Setup report generation
  setupAdminReports();
  
  // Setup token search functionality
  setupTokenSearch();

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.onclick = function() {
      loadAdminComplaintsWithFilters();
      loadAdminResolvedComplaints();
      loadAdminTokens();
      loadBouncedComplaints();
      loadAdminStatistics();
    };
  }

  // Setup sidebar navigation
  const sidebarItems = document.querySelectorAll('.dashboard-sidebar li[data-section]');
  sidebarItems.forEach(item => {
    item.addEventListener('click', function() {
      const section = this.getAttribute('data-section');
      showAdminSection(section);
    });
  });

  // Setup filter buttons
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', loadAdminComplaintsWithFilters);
  }

  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function() {
      document.getElementById('filterStatus').value = '';
      document.getElementById('filterType').value = '';
      document.getElementById('filterDateRange').value = '';
      document.getElementById('customDateInputs').style.display = 'none';
      loadAdminComplaints();
    });
  }

  // Setup report generation
  const generateReportBtn = document.getElementById('generateReportBtn');
  if (generateReportBtn) {
    generateReportBtn.addEventListener('click', generateReport);
  }

  // Setup modal close buttons
  const closeDetailsModalBtn = document.getElementById('closeDetailsModalBtn');
  if (closeDetailsModalBtn) {
    closeDetailsModalBtn.addEventListener('click', function() {
      document.getElementById('detailsModal').style.display = 'none';
    });
  }

  // Setup bounce token button
  const bounceTokenBtn = document.getElementById('bounceTokenBtn');
  if (bounceTokenBtn) {
    bounceTokenBtn.addEventListener('click', function() {
      if (window.currentComplaintData && window.currentComplaintData.token) {
        bounceToken(window.currentComplaintData.token, window.currentComplaintData);
      }
    });
  }

  // Initialize rating system if ratings section is visible
  const ratingsSection = document.getElementById('ratingsSection');
  if (ratingsSection && ratingsSection.style.display !== 'none') {
    loadAdminRatingStats();
    loadComplaintsNeedingRating();
    loadRecentRatings();
  }
}

// Show admin section
function showAdminSection(sectionName) {
  // Hide all sections
  const sections = document.querySelectorAll('.dashboard-section');
  sections.forEach(section => section.style.display = 'none');
  
  // Show selected section
  const selectedSection = document.getElementById(sectionName + 'Section');
  if (selectedSection) {
    selectedSection.style.display = 'block';
  }
  
  // Update sidebar active state
  const sidebarItems = document.querySelectorAll('.dashboard-sidebar li');
  sidebarItems.forEach(item => item.classList.remove('active'));
  const activeItem = document.querySelector(`[data-section="${sectionName}"]`);
  if (activeItem) {
    activeItem.classList.add('active');
  }
  
  // Show/hide filter bar based on section
  const filterBar = document.getElementById('filterBar');
  if (filterBar) {
    filterBar.style.display = sectionName === 'complaints' ? 'block' : 'none';
  }
  
  // Load section-specific data
  switch(sectionName) {
    case 'complaints':
      loadAdminComplaints();
      break;
    case 'resolved':
      loadAdminResolvedComplaints();
      break;
    case 'tokens':
      loadAdminTokens();
      break;
    case 'bouncedComplaints':
      loadBouncedComplaints();
      break;
    case 'ratings':
      loadAdminRatingStats();
      loadComplaintsNeedingRating();
      loadRecentRatings();
      break;
    case 'statistics':
      loadAdminStatistics();
      break;
  }
}

// --- Admin: Setup Filter Functionality ---

// Handle resolution submission
async function handleResolutionSubmission(e) {
  e.preventDefault();
  
  const resolutionDescription = document.getElementById('resolutionDescription').value.trim();
  if (!resolutionDescription) {
    document.getElementById('resolutionError').textContent = 'Resolution description is required.';
    return;
  }

  try {
    const complaintRef = db.collection('complaints').doc(resolveComplaintId);
    await complaintRef.update({
      status: 'resolved',
      resolutionDescription: resolutionDescription,
      resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      requiresRating: true, // Flag to indicate student needs to rate
      ratingRequestedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Close modal and refresh
    document.getElementById('resolutionModal').style.display = 'none';
    loadAdminComplaints();
    loadAdminStatistics();
    
    alert('Complaint resolved successfully! Student will be notified to rate the resolution.');
    
  } catch (error) {
    console.error('Error resolving complaint:', error);
    document.getElementById('resolutionError').textContent = 'Failed to resolve complaint. Please try again.';
  }
}

function setupAdminFilters() {
  // Date range filter change handler
  const filterDateRange = document.getElementById('filterDateRange');
  const customDateInputs = document.getElementById('customDateInputs');
  
  if (filterDateRange) {
    filterDateRange.onchange = function() {
      if (this.value === 'custom') {
        customDateInputs.style.display = 'block';
      } else {
        customDateInputs.style.display = 'none';
      }
    };
  }

  // Apply filters button
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  if (applyFiltersBtn) {
    applyFiltersBtn.onclick = function() {
      loadAdminComplaintsWithFilters();
    };
  }

  // Clear filters button
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  if (clearFiltersBtn) {
    clearFiltersBtn.onclick = function() {
      // Reset all filter values
      if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = '';
      if (document.getElementById('filterType')) document.getElementById('filterType').value = '';
      if (document.getElementById('filterDateRange')) document.getElementById('filterDateRange').value = '';
      if (document.getElementById('filterDateFrom')) document.getElementById('filterDateFrom').value = '';
      if (document.getElementById('filterDateTo')) document.getElementById('filterDateTo').value = '';
      
      // Hide custom date inputs
      if (customDateInputs) customDateInputs.style.display = 'none';
      
      // Load complaints without filters
      loadAdminComplaints();
    };
  }
}

// --- Admin: Setup Statistics Functionality ---
function setupAdminStatistics() {
  // Prevent multiple observers
  if (window.statisticsObserver) {
    window.statisticsObserver.disconnect();
  }

  // Load statistics when statistics section is shown
  const statisticsSection = document.getElementById('statisticsSection');
  if (statisticsSection) {
    // Create an observer to load statistics when section becomes visible
    window.statisticsObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          if (statisticsSection.style.display !== 'none' && !window.statisticsLoaded) {
            window.statisticsLoaded = true;
            loadAdminStatistics();
          } else if (statisticsSection.style.display === 'none') {
            window.statisticsLoaded = false;
          }
        }
      });
    });
    
    window.statisticsObserver.observe(statisticsSection, { attributes: true });
  }
}

// --- Admin: Setup Report Generation ---
function setupAdminReports() {
  // Report period change handler
  const reportPeriod = document.getElementById('reportPeriod');
  const reportCustomDates = document.getElementById('reportCustomDates');
  const reportCustomDates2 = document.getElementById('reportCustomDates2');
  
  if (reportPeriod) {
    reportPeriod.onchange = function() {
      if (this.value === 'custom') {
        reportCustomDates.style.display = 'block';
        reportCustomDates2.style.display = 'block';
      } else {
        reportCustomDates.style.display = 'none';
        reportCustomDates2.style.display = 'none';
      }
    };
  }

  // Generate report button
  const generateReportBtn = document.getElementById('generateReportBtn');
  if (generateReportBtn) {
    generateReportBtn.onclick = function() {
      generateReport();
    };
  }
}

// --- Admin: Setup Credit System ---


// --- Admin: Setup Token Search Functionality ---
function setupTokenSearch() {
  const tokenSearchInput = document.getElementById('tokenSearchInput');
  const tokenSearchBtn = document.getElementById('tokenSearchBtn');
  const clearTokenSearchBtn = document.getElementById('clearTokenSearchBtn');
  
  if (tokenSearchInput && tokenSearchBtn && clearTokenSearchBtn) {
    // Search button click
    tokenSearchBtn.onclick = function() {
      const searchTerm = tokenSearchInput.value.trim();
      loadAdminTokens(searchTerm);
    };
    
    // Clear button click
    clearTokenSearchBtn.onclick = function() {
      tokenSearchInput.value = '';
      loadAdminTokens();
    };
    
    // Enter key support for search
    tokenSearchBtn.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        tokenSearchBtn.click();
      }
    });
    
    console.log('✅ Token search functionality setup completed');
  } else {
    console.log('⚠️ Token search elements not found');
  }
}



// --- Admin: Load All Tokens ---
async function loadAdminTokens(searchTerm = '') {
  const tableBody = document.getElementById('adminTokensTableBody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '<tr><td colspan="6">Loading tokens...</td></tr>';
  
  try {
    const snapshot = await db.collection('complaints')
      .orderBy('createdAt', 'desc')
      .get();
    
    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="6">No tokens found.</td></tr>';
      return;
    }
    
    tableBody.innerHTML = '';
    let filteredDocs = snapshot.docs;
    
    // Apply search filter if search term is provided
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filteredDocs = snapshot.docs.filter(doc => {
        const data = doc.data();
        const token = (data.token || doc.id).toLowerCase();
        const complaintType = (data.complaintType || '').toLowerCase();
        const user = (data.isAnonymous ? 'anonymous' : (data.name || data.email || '')).toLowerCase();
        
        return token.includes(searchLower) || 
               complaintType.includes(searchLower) || 
               user.includes(searchLower);
      });
    }
    
    if (filteredDocs.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">No tokens found matching your search.</td></tr>';
      return;
    }
    
    filteredDocs.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${data.token || doc.id}</strong></td>
        <td>${data.complaintType || 'N/A'}</td>
        <td>
          <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; 
            background: ${data.status === 'resolved' ? '#4caf50' : '#ff9800'}; 
            color: white;">
            ${data.status || 'pending'}
          </span>
        </td>
        <td>${data.isAnonymous ? 'Anonymous' : (data.name || data.email || 'N/A')}</td>
        <td>${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : 'N/A'}</td>
        <td>
          <button class='btn-view' onclick="showComplaintDetails('${doc.id}', ${JSON.stringify(data).replace(/"/g, '&quot;')})">View</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load tokens:', err);
    tableBody.innerHTML = '<tr><td colspan="6">Failed to load tokens. Error: ' + err.message + '</td></tr>';
  }
}

// --- Admin: Load Bounced Complaints ---
async function loadBouncedComplaints() {
  const tableBody = document.getElementById('bouncedComplaintsTableBody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '<tr><td colspan="6">Loading bounced complaints...</td></tr>';
  
  try {
    const snapshot = await db.collection('bouncedComplaints')
      .orderBy('bouncedAt', 'desc')
      .get();
    
    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="6">No bounced complaints found.</td></tr>';
      return;
    }
    
    tableBody.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${data.token || doc.id}</strong></td>
        <td>${data.complaintType || 'N/A'}</td>
        <td>${data.originalResolution || 'N/A'}</td>
        <td>${data.isAnonymous ? 'Anonymous' : (data.name || data.email || 'N/A')}</td>
        <td>${data.bouncedAt && data.bouncedAt.toDate ? data.bouncedAt.toDate().toLocaleString() : 'N/A'}</td>
        <td>
          <button class='btn-view' onclick="showComplaintDetails('${doc.id}', ${JSON.stringify(data).replace(/"/g, '&quot;')})">View</button>
          <button class='btn-resolve' onclick="reResolveBouncedComplaint('${doc.id}')">Re-resolve</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load bounced complaints:', err);
    tableBody.innerHTML = '<tr><td colspan="6">Failed to load bounced complaints. Error: ' + err.message + '</td></tr>';
  }
}

// --- Admin: Re-resolve Bounced Complaint ---
async function reResolveBouncedComplaint(bouncedComplaintId) {
  try {
    const bouncedComplaint = await db.collection('bouncedComplaints').doc(bouncedComplaintId).get();
    if (!bouncedComplaint.exists) {
      alert('Bounced complaint not found.');
      return;
    }
    
    const bouncedData = bouncedComplaint.data();
    const originalComplaintId = bouncedData.originalComplaintId;
    
    // Show resolution modal
    resolveComplaintId = originalComplaintId;
    const resolutionDescription = document.getElementById('resolutionDescription');
    const resolutionError = document.getElementById('resolutionError');
    const resolutionModal = document.getElementById('resolutionModal');
    
    if (resolutionDescription) resolutionDescription.value = '';
    if (resolutionError) resolutionError.textContent = '';
    if (resolutionModal) resolutionModal.style.display = 'flex';
    
    // Update the modal title
    const modalTitle = resolutionModal.querySelector('h2');
    if (modalTitle) modalTitle.textContent = 'Re-resolve Bounced Complaint';
    
  } catch (error) {
    console.error('Error re-resolving bounced complaint:', error);
    alert('Failed to re-resolve complaint. Please try again.');
  }
} // End of setupAdminDashboard function

// --- Bounce Token Functionality ---

// Show bounce button when complaint is resolved
function showBounceButton(complaintData) {
  const bounceSection = document.getElementById('bounceSection');
  if (bounceSection && complaintData && complaintData.status) {
    if (complaintData.status === 'resolved') {
      bounceSection.style.display = 'block';
      console.log('Bounce button shown for resolved complaint:', complaintData);
    } else {
      bounceSection.style.display = 'none';
      console.log('Bounce button hidden - complaint not resolved:', complaintData.status);
    }
  } else {
    console.log('Bounce section not found or invalid complaint data');
  }
}

// Bounce a token
async function bounceToken(token, complaintData) {
  try {
    console.log('Bouncing token:', token, 'for complaint:', complaintData);
    
    // Validate complaint data and provide fallbacks for missing fields
    if (!complaintData) {
      console.error('No complaint data provided for bounce');
      return false;
    }
    
    // Create bounced complaint record with safe field access
    await db.collection('bouncedComplaints').add({
      token: token || 'unknown',
      complaintType: complaintData.complaintType || 'unknown',
      originalResolution: complaintData.resolutionDescription || 'No resolution provided',
      originalComplaintId: complaintData.id || 'unknown',
      userEmail: complaintData.email || 'anonymous',
      name: complaintData.name || 'Anonymous User',
      isAnonymous: complaintData.isAnonymous || true,
      bouncedAt: firebase.firestore.FieldValue.serverTimestamp(),
      reason: 'User disagreed with resolution'
    });
    

    
    // Update original complaint status if we have an ID
    if (complaintData.id) {
      await db.collection('complaints').doc(complaintData.id).update({
        status: 'bounced',
        bouncedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    console.log('Token bounced successfully');
    return true;
  } catch (error) {
    console.error('Error bouncing token:', error);
    return false;
  }
}

// --- Status Check with Bounce Functionality ---
async function checkComplaintStatus(token) {
  try {
    const querySnapshot = await db.collection('complaints').where('token', '==', token).get();
    
    if (querySnapshot.empty) {
      return { success: false, message: 'No complaint found with this token.' };
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    data.id = doc.id;
    
    // Ensure all required fields have default values
    data.complaintType = data.complaintType || 'General';
    data.description = data.description || 'No description provided';
    data.email = data.email || 'anonymous';
    data.name = data.name || 'Anonymous User';
    data.isAnonymous = data.isAnonymous !== undefined ? data.isAnonymous : true;
    
    let statusMessage = `<strong>Status:</strong> ${data.status || 'Unknown'}`;
    
    if (data.status === 'resolved') {
      statusMessage += `<br><strong>Resolution:</strong> ${data.resolutionDescription || 'No resolution details provided.'}`;
      statusMessage += `<br><strong>Resolved Date:</strong> ${data.resolvedAt && data.resolvedAt.toDate ? data.resolvedAt.toDate().toLocaleString() : 'Unknown'}`;
    }
    
    statusMessage += `<br><strong>Type:</strong> ${data.complaintType || 'N/A'}`;
    statusMessage += `<br><strong>Description:</strong> ${data.description || 'N/A'}`;
    statusMessage += `<br><strong>Submitted:</strong> ${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : 'N/A'}`;
    
    // Store complaint data globally for bounce functionality
    window.currentComplaintData = data;
    
    // Show bounce button if complaint is resolved (only if we're on status page)
    if (window.location.pathname.includes('status.html')) {
      showBounceButton(data);
    }
    
    return { 
      success: true, 
      message: statusMessage, 
      data: data 
    };
    
  } catch (error) {
    console.error('Error checking complaint status:', error);
    return { success: false, message: 'Error checking status. Please try again.' };
  }
}



// --- Main Entrypoint ---
document.addEventListener('DOMContentLoaded', function() {
  const page = getPage();
  if (page === 'index') setupIndexPage();
  else if (page === 'login') setupLoginPage();
  else if (page === 'register') setupRegisterPage();
  else if (page === 'status') setupStatusPage();
  else if (page === 'user') setupUserDashboard();
  else if (page === 'admin') setupAdminDashboard();
});





// --- Debug Credit System Function ---
async function debugCreditSystem() {
  try {
    console.log('🔍 Debugging credit system...');
    
    // Get current user email
    let userEmail = '';
    
    if (firebase.auth().currentUser) {
      userEmail = firebase.auth().currentUser.email;
    } else {
      userEmail = localStorage.getItem('userEmail') || '';
    }
    
    if (!userEmail) {
      console.log('⚠️ No user email found for debugging');
      return;
    }
    
    console.log('👤 Debugging for user:', userEmail);
    
    // Check user document
    const userDoc = await db.collection('users').doc(userEmail).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('📊 User document found:', userData);
    } else {
      console.log('❌ User document not found, creating...');
      await initializeUserCredits(userEmail);
    }
    
    // Check bounced complaints
    const bouncedSnapshot = await db.collection('bouncedComplaints').get();
    console.log(`📋 Found ${bouncedSnapshot.size} bounced complaints`);
    
    // Check if any bounced complaints belong to this user
    const userBouncedComplaints = bouncedSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.userEmail === userEmail;
    });
    
    console.log(`👤 User has ${userBouncedComplaints.length} bounced complaints`);
    
    // Show debug info in the test result area
    const resultElement = document.getElementById('creditTestResult');
    if (resultElement) {
      resultElement.innerHTML = `
        <span style="color: #2196f3;">
          🔍 Debug Info:<br>
          User: ${userEmail}<br>
          User Document: ${userDoc.exists ? 'Found' : 'Not Found'}<br>
          Total Bounced Complaints: ${bouncedSnapshot.size}<br>
          User Bounced Complaints: ${userBouncedComplaints.length}
        </span>
      `;
      setTimeout(() => {
        resultElement.innerHTML = '';
      }, 8000);
    }
    
  } catch (error) {
    console.error('❌ Error debugging credit system:', error);
    const resultElement = document.getElementById('creditTestResult');
    if (resultElement) {
      resultElement.innerHTML = '<span style="color: #f44336;">❌ Error during debug. Please try again.</span>';
      setTimeout(() => {
        resultElement.innerHTML = '';
      }, 5000);
    }
  }
}





// --- Real-Time Credit System Functions ---

// --- Refresh Credit System Function ---
async function refreshCreditSystem() {
  try {
    console.log('🔄 Refreshing credit system...');
    
    const statusElement = document.getElementById('creditSystemStatus');
    if (statusElement) {
      statusElement.innerHTML = '<span style="color: #2196f3;">🔄 Refreshing system data...</span>';
    }
    
    // Update live credit system status
    await updateLiveCreditStatus();
    
    // Refresh credit reports if visible
    if (document.getElementById('creditReportsSection').style.display !== 'none') {
      await loadCreditReports();
    }
    
    if (statusElement) {
      statusElement.innerHTML = '<span style="color: #4caf50;">✅ System refreshed successfully!</span>';
      // Clear success message after 3 seconds
      setTimeout(() => {
        statusElement.innerHTML = '<span style="color: #2196f3;">🔄 System ready. Click "Refresh System" to update live data.</span>';
      }, 3000);
    }
    
    console.log('✅ Credit system refreshed successfully');
    
  } catch (error) {
    console.error('❌ Error refreshing credit system:', error);
    const statusElement = document.getElementById('creditSystemStatus');
    if (statusElement) {
      statusElement.innerHTML = '<span style="color: #f44336;">❌ Error refreshing system. Please try again.</span>';
      // Clear error message after 5 seconds
      setTimeout(() => {
        statusElement.innerHTML = '<span style="color: #2196f3;">🔄 System ready. Click "Refresh System" to update live data.</span>';
      }, 5000);
    }
  }
}

// --- Update Live Credit Status Function ---
async function updateLiveCreditStatus() {
  try {
    console.log('📊 Updating live credit status...');
    
    // Get real-time data from Firestore
    const usersSnapshot = await db.collection('users').get();
    const complaintsSnapshot = await db.collection('complaints').get();
    
    let totalUsers = 0;
    let totalCreditScore = 0;
    let activeComplaints = 0;
    let currentUserCredits = 0;
    let currentUserScore = 0;
    
    // Calculate user statistics
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.creditScore !== undefined) {
        totalUsers++;
        totalCreditScore += parseFloat(userData.creditScore || 0);
        
        // For admin dashboard, show current user (test user) data
        if (doc.id === 'admin-test@rvrjcce.edu.in') {
          currentUserCredits = parseFloat(userData.totalCredits || 100);
          currentUserScore = parseFloat(userData.creditScore || 100);
        }
      }
    });
    
    // Calculate active complaints
    complaintsSnapshot.forEach(doc => {
      const complaintData = doc.data();
      if (complaintData.status === 'submitted' || complaintData.status === 'in_progress') {
        activeComplaints++;
      }
    });
    
    // Update live display elements
    const liveCreditScore = document.getElementById('liveCreditScore');
    const liveTotalCredits = document.getElementById('liveTotalCredits');
    const liveComplaintsCount = document.getElementById('liveComplaintsCount');
    
    if (liveCreditScore) liveCreditScore.textContent = currentUserScore.toFixed(2);
    if (liveTotalCredits) liveTotalCredits.textContent = currentUserCredits.toFixed(2);
    if (liveComplaintsCount) liveComplaintsCount.textContent = activeComplaints.toString();
    
    console.log('✅ Live credit status updated:', {
      totalUsers,
      averageCreditScore: totalUsers > 0 ? (totalCreditScore / totalUsers).toFixed(2) : 0,
      activeComplaints,
      currentUserCredits: currentUserCredits.toFixed(2),
      currentUserScore: currentUserScore.toFixed(2)
    });
    
  } catch (error) {
    console.error('❌ Error updating live credit status:', error);
  }
}



// --- Main Entrypoint ---

// --- Check Current Credits Function ---
async function checkCurrentCredits(userEmail) {
  try {
    console.log('🔍 Checking current credits for:', userEmail);
    
    const userDoc = await db.collection('users').doc(userEmail).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('📊 Current User Credits:', {
        email: userData.email,
        creditScore: userData.creditScore,
        totalCredits: userData.totalCredits,
        complaintsSubmitted: userData.complaintsSubmitted,
        complaintsResolved: userData.complaintsResolved,
        complaintsBounced: userData.complaintsBounced,
        complaintsOverdue: userData.complaintsOverdue
      });
      
      // Update display if on admin page
      if (window.location.pathname.includes('admin-dashboard.html')) {
        loadCurrentUserCredits();
      }
    } else {
      console.log('❌ User document not found for:', userEmail);
    }
    
  } catch (error) {
    console.error('Error checking current credits:', error);
  }
}

// --- Load Credit Reports Function ---
async function loadCreditReports() {
  try {
    console.log('📊 Loading credit reports...');
    
    // This function can be expanded to load detailed credit reports
    // For now, it just loads the basic admin credit reports
    await loadAdminCreditReports();
    
    console.log('✅ Credit reports loaded successfully');
  } catch (error) {
    console.error('❌ Error loading credit reports:', error);
  }
}

// --- Load Admin Credit Reports Function ---
async function loadAdminCreditReports() {
  try {
    console.log('📊 Loading admin credit reports...');
    // Placeholder for admin credit reports functionality
    // This can be expanded to load detailed reports from Firestore
    console.log('✅ Admin credit reports loaded successfully');
  } catch (error) {
    console.error('❌ Error loading admin credit reports:', error);
  }
}

// --- Load Current User Credits Function ---
async function loadCurrentUserCredits() {
  try {
    console.log('📊 Loading current user credits...');
    // Placeholder for loading current user credits display
    // This can be expanded to update the admin dashboard UI
    console.log('✅ Current user credits loaded successfully');
  } catch (error) {
    console.error('❌ Error loading current user credits:', error);
  }
}

// --- Manual Credit Update Function (for testing) ---

// --- Check Credits After Bounce Function ---
async function checkCreditsAfterBounce() {
  try {
    const resultElement = document.getElementById('creditCheckResult');
    resultElement.innerHTML = '<span style="color: #2196f3;">🔍 Checking credits...</span>';
    
    if (!window.currentComplaintData || !window.currentComplaintData.email) {
      resultElement.innerHTML = '<span style="color: #f44336;">❌ No complaint data found. Please check status first.</span>';
      return;
    }
    
    const userEmail = window.currentComplaintData.email;
    if (userEmail === 'anonymous') {
      resultElement.innerHTML = '<span style="color: #ff9800;">⚠️ Anonymous complaints cannot track credits.</span>';
      return;
    }
    
    // Check current credits
    await checkCurrentCredits(userEmail);
    
    resultElement.innerHTML = '<span style="color: #4caf50;">✅ Credits checked! Check console for details.</span>';
    
  } catch (error) {
    console.error('Error checking credits after bounce:', error);
    document.getElementById('creditCheckResult').innerHTML = '<span style="color: #f44336;">❌ Error checking credits.</span>';
  }
}

// --- Initialize User Credits Function ---
async function initializeUserCredits(userEmail) {
  try {
    console.log('🔧 Initializing user credits for:', userEmail);
    
    // Create or update user document with default credit values
    await db.collection('users').doc(userEmail).set({
      email: userEmail,
      creditScore: 100.0,
      totalCredits: 100.0,
      complaintsSubmitted: 0,
      complaintsResolved: 0,
      complaintsBounced: 0,
      complaintsOverdue: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('✅ User credits initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing user credits:', error);
  }
}

// --- Global Test Functions (for console testing) ---

// Make functions available globally for console testing
window.checkCurrentCredits = checkCurrentCredits;
window.loadCreditReports = loadCreditReports;
window.checkCreditsAfterBounce = checkCreditsAfterBounce;
window.loadAdminCreditReports = loadAdminCreditReports;
window.loadCurrentUserCredits = loadCurrentUserCredits;
window.initializeUserCredits = initializeUserCredits;

// Rating system functions
window.submitComplaintRating = submitComplaintRating;
window.showRatingInterface = showRatingInterface;
window.loadAdminRatingStats = loadAdminRatingStats;
window.loadComplaintsNeedingRating = loadComplaintsNeedingRating;
window.loadRecentRatings = loadRecentRatings;
window.sendRatingReminder = sendRatingReminder;

// End of script.js

// Add event listeners for index page buttons
document.addEventListener('DOMContentLoaded', function() {
  // Login/Register button
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', function() {
      window.location.href = 'login.html';
    });
  }

  // Anonymous submit button
  const anonymousBtn = document.getElementById('anonymousBtn');
  if (anonymousBtn) {
    anonymousBtn.addEventListener('click', function() {
      window.location.href = 'anonymous.html';
    });
  }

  // Submit complaint button
  const submitComplaintBtn = document.getElementById('submitComplaintBtn');
  if (submitComplaintBtn) {
    submitComplaintBtn.addEventListener('click', function() {
      window.location.href = 'complaint.html';
    });
  }

  // Check status button
  const checkStatusBtn = document.getElementById('checkStatusBtn');
  if (checkStatusBtn) {
    checkStatusBtn.addEventListener('click', function() {
      window.location.href = 'status.html';
    });
  }

  // Admin login button
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', function() {
      window.location.href = 'admin.html';
    });
  }

  // Setup complaint form handlers
  setupComplaintForms();
  
  // Initialize page-specific functionality
  initializePage();
});

// Setup complaint form handlers
function setupComplaintForms() {
  // Regular complaint form
  const complaintForm = document.getElementById('complaintForm');
  if (complaintForm) {
    complaintForm.addEventListener('submit', handleComplaintSubmission);
  }

  // Anonymous complaint form
  const anonymousComplaintForm = document.getElementById('anonymousComplaintForm');
  if (anonymousComplaintForm) {
    anonymousComplaintForm.addEventListener('submit', handleAnonymousComplaintSubmission);
  }

  // Status form
  const statusForm = document.getElementById('statusForm');
  if (statusForm) {
    statusForm.addEventListener('submit', handleStatusCheck);
  }

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Register form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
}

// Handle regular complaint submission
async function handleComplaintSubmission(e) {
  e.preventDefault();
  
  const complaintName = document.getElementById('complaintName').value.trim();
  const complaintEmail = document.getElementById('complaintEmail').value.trim();
  const complaintType = document.getElementById('complaintType').value;
  const complaintDescription = document.getElementById('complaintDescription').value;
  const requiredResolution = document.getElementById('requiredResolution').value;
  
  if (!complaintName || !complaintEmail || !complaintType || !complaintDescription || !requiredResolution) {
    alert('Please fill in all required fields.');
    return;
  }

  try {
    const token = generateToken();
    
    await db.collection('complaints').add({
      token: token,
      name: complaintName,
      email: complaintEmail,
      type: complaintType,
      description: complaintDescription,
      requiredResolution: requiredResolution,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isAnonymous: false
    });

    // Show success message
    const complaintForm = document.getElementById('complaintForm');
    const tokenSection = document.getElementById('tokenSection');
    if (complaintForm && tokenSection) {
      complaintForm.style.display = 'none';
      const tokenDisplay = document.getElementById('tokenDisplay');
      if (tokenDisplay) {
        tokenDisplay.textContent = token;
      }
      tokenSection.style.display = 'block';
      complaintForm.reset();
    }
    
  } catch (err) {
    console.error('Error submitting complaint:', err);
    alert('Failed to submit complaint. Please try again.');
  }
}

// Handle anonymous complaint submission
async function handleAnonymousComplaintSubmission(e) {
  e.preventDefault();
  
  const complaintType = document.getElementById('complaintType').value;
  const complaintDescription = document.getElementById('complaintDescription').value;
  const requiredResolution = document.getElementById('requiredResolution').value;
  
  if (!complaintType || !complaintDescription || !requiredResolution) {
    alert('Please fill in all required fields.');
    return;
  }

  try {
    const token = generateToken();
    
    await db.collection('complaints').add({
      token: token,
      type: complaintType,
      description: complaintDescription,
      requiredResolution: requiredResolution,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isAnonymous: true
    });

    // Show success message
    const anonymousComplaintForm = document.getElementById('anonymousComplaintForm');
    const tokenSection = document.getElementById('tokenSection');
    if (anonymousComplaintForm && tokenSection) {
      anonymousComplaintForm.style.display = 'none';
      const tokenDisplay = document.getElementById('tokenDisplay');
      if (tokenDisplay) {
        tokenDisplay.textContent = token;
      }
      tokenSection.style.display = 'block';
      anonymousComplaintForm.reset();
    }
    
  } catch (err) {
    console.error('Error submitting anonymous complaint:', err);
    alert('Failed to submit complaint. Please try again.');
  }
}

// Handle status check
async function handleStatusCheck(e) {
  e.preventDefault();
  
  const token = document.getElementById('token').value.trim();
  if (!token) {
    alert('Please enter a token.');
    return;
  }

  try {
    const snapshot = await db.collection('complaints').where('token', '==', token).get();
    
    if (snapshot.empty) {
      document.getElementById('statusResult').innerHTML = '<p style="color: #f44336;">Token not found. Please check your token.</p>';
      return;
    }

    const complaint = snapshot.docs[0].data();
    const complaintId = snapshot.docs[0].id; // Store the document ID
    const statusResult = document.getElementById('statusResult');
    
    statusResult.innerHTML = `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <h3>Complaint Status: ${complaint.status.toUpperCase()}</h3>
        <p><strong>Type:</strong> ${complaint.type}</p>
        <p><strong>Description:</strong> ${complaint.description}</p>
        <p><strong>Required Resolution:</strong> ${complaint.requiredResolution}</p>
        <p><strong>Submitted:</strong> ${complaint.createdAt && complaint.createdAt.toDate ? complaint.createdAt.toDate().toLocaleString() : 'N/A'}</p>
        ${complaint.resolutionDescription ? `<p><strong>Resolution:</strong> ${complaint.resolutionDescription}</p>` : ''}
        ${complaint.resolvedAt ? `<p><strong>Resolved:</strong> ${complaint.resolvedAt.toDate ? complaint.resolvedAt.toDate().toLocaleString() : 'N/A'}</p>` : ''}
      </div>
    `;

    // Show rating interface if resolved and doesn't have a rating yet
    console.log('Checking rating requirements:', {
      status: complaint.status,
      hasRating: !!complaint.studentRating,
      requiresRating: complaint.requiresRating
    });
    
    if (complaint.status === 'resolved' && !complaint.studentRating) {
      console.log('Should show rating interface for complaint:', complaintId);
      const ratingSection = document.getElementById('ratingSection');
      if (ratingSection) {
        console.log('Rating section found, showing interface');
        showRatingInterface(complaintId, complaint);
      } else {
        console.log('Rating section not found in DOM');
      }
    } else {
      console.log('Rating interface not shown because:', {
        status: complaint.status,
        hasRating: !!complaint.studentRating
      });
    }
    
    // Show bounce button if resolved and already rated
    if (complaint.status === 'resolved' && complaint.studentRating) {
      const bounceSection = document.getElementById('bounceSection');
      if (bounceSection) {
        bounceSection.style.display = 'block';
        // Store current complaint data for bounce functionality
        window.currentComplaintData = complaint;
      }
    }
    
  } catch (err) {
    console.error('Error checking status:', err);
    document.getElementById('statusResult').innerHTML = '<p style="color: #f44336;">Error checking status. Please try again.</p>';
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    alert('Please fill in all fields.');
    return;
  }

  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    window.location.href = 'dashboard.html';
  } catch (err) {
    console.error('Login error:', err);
    const loginError = document.getElementById('loginError');
    if (loginError) {
      loginError.textContent = err.message;
    }
  }
}

// Handle register
async function handleRegister(e) {
  e.preventDefault();
  
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const userType = document.getElementById('userType').value;
  
  if (!name || !email || !password || !userType) {
    alert('Please fill in all required fields.');
    return;
  }

  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    
    // Save additional user data
    await db.collection('users').doc(email).set({
      name: name,
      email: email,
      userType: userType,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Initialize user credits
    await initializeUserCredits(email);
    
    alert('Registration successful! You can now login.');
    window.location.href = 'login.html';
    
  } catch (err) {
    console.error('Registration error:', err);
    alert('Registration failed: ' + err.message);
  }
}

// ===== STUDENT RATING SYSTEM =====

// Submit student rating for resolved complaint
async function submitComplaintRating(complaintId, rating, feedback = '') {
  try {
    const complaintRef = db.collection('complaints').doc(complaintId);
    
    // Update complaint with rating
    await complaintRef.update({
      studentRating: rating,
      studentFeedback: feedback,
      ratedAt: firebase.firestore.FieldValue.serverTimestamp(),
      requiresRating: false,
      status: rating <= 2 ? 'reopened_by_student' : 'resolved' // Reopen if rating is low
    });

    // If rating is low (1-2), create a notification for admin review
    if (rating <= 2) {
      await db.collection('adminNotifications').add({
        complaintId: complaintId,
        type: 'low_rating',
        rating: rating,
        feedback: feedback,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending_review'
      });
    }

    // Store rating in separate collection for analytics
    await db.collection('complaintRatings').add({
      complaintId: complaintId,
      rating: rating,
      feedback: feedback,
      ratedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error submitting rating:', error);
    return false;
  }
}

// Check if complaint requires rating
function checkRatingRequired(complaintData) {
  return complaintData.status === 'resolved' && 
         !complaintData.studentRating;
}

// Show rating interface for resolved complaints
function showRatingInterface(complaintId, complaintData) {
  console.log('showRatingInterface called with:', { complaintId, complaintData });
  
  const ratingSection = document.getElementById('ratingSection');
  if (!ratingSection) {
    console.error('Rating section element not found in DOM');
    return;
  }

  console.log('Rating section found, setting display to block');
  ratingSection.style.display = 'block';
  
  ratingSection.innerHTML = `
    <div class="rating-container">
      <h3>Rate Your Resolution</h3>
      <p>How satisfied are you with the resolution of your complaint?</p>
      
      <div class="rating-stars">
        <span class="star" data-rating="1">⭐</span>
        <span class="star" data-rating="2">⭐</span>
        <span class="star" data-rating="3">⭐</span>
        <span class="star" data-rating="4">⭐</span>
        <span class="star" data-rating="5">⭐</span>
      </div>
      
      <div class="rating-labels">
        <span>Very Dissatisfied</span>
        <span>Dissatisfied</span>
        <span>Neutral</span>
        <span>Satisfied</span>
        <span>Very Satisfied</span>
      </div>
      
      <div class="rating-feedback">
        <label for="ratingFeedback">Additional Feedback (Optional):</label>
        <textarea id="ratingFeedback" rows="3" placeholder="Share your thoughts about the resolution..."></textarea>
      </div>
      
      <button id="submitRatingBtn" class="btn-primary">Submit Rating</button>
    </div>
  `;

  // Add event listeners for rating stars
  const stars = ratingSection.querySelectorAll('.star');
  let selectedRating = 0;

  stars.forEach((star, index) => {
    star.addEventListener('click', function() {
      selectedRating = index + 1;
      
      // Update star display
      stars.forEach((s, i) => {
        if (i < selectedRating) {
          s.style.color = '#ffd700'; // Gold for selected
        } else {
          s.style.color = '#ccc'; // Gray for unselected
        }
      });
    });

    // Hover effects
    star.addEventListener('mouseenter', function() {
      const rating = index + 1;
      stars.forEach((s, i) => {
        if (i < rating) {
          s.style.color = '#ffd700';
        } else {
          s.style.color = '#ccc';
        }
      });
    });

    star.addEventListener('mouseleave', function() {
      stars.forEach((s, i) => {
        if (i < selectedRating) {
          s.style.color = '#ffd700';
        } else {
          s.style.color = '#ccc';
        }
      });
    });
  });

  // Submit rating button
  const submitRatingBtn = document.getElementById('submitRatingBtn');
  if (submitRatingBtn) {
    submitRatingBtn.addEventListener('click', async function() {
      if (selectedRating === 0) {
        alert('Please select a rating before submitting.');
        return;
      }

      const feedback = document.getElementById('ratingFeedback').value.trim();
      
      const success = await submitComplaintRating(complaintId, selectedRating, feedback);
      
      if (success) {
        ratingSection.innerHTML = `
          <div class="rating-success">
            <h3>Thank You!</h3>
            <p>Your rating has been submitted successfully.</p>
            ${selectedRating <= 2 ? '<p><strong>Note:</strong> Your complaint has been reopened for further review due to low satisfaction.</p>' : ''}
          </div>
        `;
        
        // Refresh the page after a delay
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        alert('Failed to submit rating. Please try again.');
      }
    });
  }
}

// Load admin rating statistics
async function loadAdminRatingStats() {
  try {
    const statsContainer = document.getElementById('adminRatingStats');
    if (!statsContainer) return;

    // Get all resolved complaints with ratings - simplified query
    const snapshot = await db.collection('complaints')
      .where('status', '==', 'resolved')
      .get();

    if (snapshot.empty) {
      statsContainer.innerHTML = '<p>No resolved complaints available yet.</p>';
      return;
    }

    let totalRating = 0;
    let totalComplaints = 0;
    let lowRatings = 0;
    let highRatings = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.studentRating && data.studentRating > 0) {
        totalRating += data.studentRating;
        totalComplaints++;
        
        if (data.studentRating <= 2) {
          lowRatings++;
        } else if (data.studentRating >= 4) {
          highRatings++;
        }
      }
    });

    if (totalComplaints === 0) {
      statsContainer.innerHTML = '<p>No ratings available yet.</p>';
      return;
    }

    const averageRating = (totalRating / totalComplaints).toFixed(1);
    const satisfactionRate = ((highRatings / totalComplaints) * 100).toFixed(1);

    statsContainer.innerHTML = `
      <div class="rating-stats-grid">
        <div class="stat-card">
          <h3>${averageRating}</h3>
          <p>Average Rating</p>
        </div>
        <div class="stat-card">
          <h3>${totalComplaints}</h3>
          <p>Total Rated</p>
        </div>
        <div class="stat-card">
          <h3>${satisfactionRate}%</h3>
          <p>Satisfaction Rate</p>
        </div>
        <div class="stat-card warning">
          <h3>${lowRatings}</h3>
          <p>Low Ratings (1-2)</p>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Error loading rating stats:', error);
    const statsContainer = document.getElementById('adminRatingStats');
    if (statsContainer) {
      statsContainer.innerHTML = '<p>Error loading rating statistics.</p>';
    }
  }
}

// Load complaints that need rating
async function loadComplaintsNeedingRating() {
  try {
    const container = document.getElementById('complaintsNeedingRating');
    if (!container) return;

    // Simplified query - just get resolved complaints without ratings
    const snapshot = await db.collection('complaints')
      .where('status', '==', 'resolved')
      .get();

    if (snapshot.empty) {
      container.innerHTML = '<p>No resolved complaints available.</p>';
      return;
    }

    // Filter on client side to avoid complex indexes
    const complaintsNeedingRating = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.studentRating && data.status === 'resolved') {
        complaintsNeedingRating.push({ id: doc.id, ...data });
      }
    });

    if (complaintsNeedingRating.length === 0) {
      container.innerHTML = '<p>No complaints waiting for student ratings.</p>';
      return;
    }

    let html = '<h3>Complaints Awaiting Student Rating</h3><div class="rating-queue">';
    
    complaintsNeedingRating.forEach(complaint => {
      const daysSinceResolution = complaint.resolvedAt ? 
        Math.floor((Date.now() - complaint.resolvedAt.toDate()) / (1000 * 60 * 60 * 24)) : 0;
      
      html += `
        <div class="rating-queue-item">
          <div class="complaint-info">
            <strong>Token:</strong> ${complaint.token}<br>
            <strong>Type:</strong> ${complaint.type}<br>
            <strong>Days Since Resolution:</strong> ${daysSinceResolution}
          </div>
          <div class="rating-actions">
            <button onclick="sendRatingReminder('${complaint.id}')" class="btn-secondary">Send Reminder</button>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading complaints needing rating:', error);
    const container = document.getElementById('complaintsNeedingRating');
    if (container) {
      container.innerHTML = '<p>Error loading complaints.</p>';
    }
  }
}

// Send rating reminder to student
async function sendRatingReminder(complaintId) {
  try {
    // Update the complaint to show reminder was sent
    await db.collection('complaints').doc(complaintId).update({
      lastReminderSent: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('Rating reminder sent to student.');
    
    // Refresh the list
    loadComplaintsNeedingRating();
    
  } catch (error) {
    console.error('Error sending reminder:', error);
    alert('Failed to send reminder. Please try again.');
  }
}

// Load recent student ratings
async function loadRecentRatings() {
  try {
    const container = document.getElementById('recentRatings');
    if (!container) return;

    // Simplified query - just get complaints with ratings
    const snapshot = await db.collection('complaints')
      .where('studentRating', '>', 0)
      .get();

    if (snapshot.empty) {
      container.innerHTML = '<p>No ratings available yet.</p>';
      return;
    }

    // Sort on client side to avoid complex indexes
    const ratings = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.studentRating > 0) {
        ratings.push({ id: doc.id, ...data });
      }
    });

    // Sort by rating (desc) then by date (desc)
    ratings.sort((a, b) => {
      if (b.studentRating !== a.studentRating) {
        return b.studentRating - a.studentRating;
      }
      if (a.ratedAt && b.ratedAt) {
        return b.ratedAt.toDate() - a.ratedAt.toDate();
      }
      return 0;
    });

    // Take only the first 10
    const recentRatings = ratings.slice(0, 10);

    let html = '<div class="recent-ratings-list">';
    
    recentRatings.forEach(complaint => {
      const ratingDate = complaint.ratedAt && complaint.ratedAt.toDate ? 
        complaint.ratedAt.toDate().toLocaleString() : 'Unknown';
      const stars = '⭐'.repeat(complaint.studentRating) + '☆'.repeat(5 - complaint.studentRating);
      
      html += `
        <div class="rating-item ${complaint.studentRating <= 2 ? 'low-rating' : ''}">
          <div class="rating-header">
            <span class="rating-stars">${stars}</span>
            <span class="rating-date">${ratingDate}</span>
          </div>
          <div class="complaint-details">
            <strong>Token:</strong> ${complaint.token} | 
            <strong>Type:</strong> ${complaint.type} | 
            <strong>Rating:</strong> ${complaint.studentRating}/5
          </div>
          ${complaint.studentFeedback ? `<div class="rating-feedback"><strong>Feedback:</strong> ${complaint.studentFeedback}</div>` : ''}
          ${complaint.studentRating <= 2 ? '<div class="low-rating-alert">⚠️ Low rating - requires attention</div>' : ''}
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading recent ratings:', error);
    const container = document.getElementById('recentRatings');
    if (container) {
      container.innerHTML = '<p>Error loading recent ratings.</p>';
    }
  }
}



// Show admin section
function showAdminSection(sectionName) {
  // Hide all sections
  const sections = document.querySelectorAll('.dashboard-section');
  sections.forEach(section => section.style.display = 'none');
  
  // Show selected section
  const selectedSection = document.getElementById(sectionName + 'Section');
  if (selectedSection) {
    selectedSection.style.display = 'block';
  }
  
  // Update sidebar active state
  const sidebarItems = document.querySelectorAll('.dashboard-sidebar li');
  sidebarItems.forEach(item => item.classList.remove('active'));
  const activeItem = document.querySelector(`[data-section="${sectionName}"]`);
  if (activeItem) {
    activeItem.classList.add('active');
  }
  
  // Show/hide filter bar based on section
  const filterBar = document.getElementById('filterBar');
  if (filterBar) {
    filterBar.style.display = sectionName === 'complaints' ? 'block' : 'none';
  }
  
  // Load section-specific data
  switch(sectionName) {
    case 'complaints':
      loadAdminComplaints();
      break;
    case 'resolved':
      loadAdminResolvedComplaints();
      break;
    case 'tokens':
      loadAdminTokens();
      break;
    case 'bouncedComplaints':
      loadBouncedComplaints();
      break;
    case 'ratings':
      loadAdminRatingStats();
      loadComplaintsNeedingRating();
      loadRecentRatings();
      break;
    case 'statistics':
      loadAdminStatistics();
      break;
  }
}

// Setup user dashboard event handlers
function setupUserDashboard() {
  // New complaint button
  const newComplaintBtn = document.getElementById('newComplaintBtn');
  if (newComplaintBtn) {
    newComplaintBtn.addEventListener('click', function() {
      window.location.href = 'complaint.html';
    });
  }

  // User dropdown
  const userAvatarBtn = document.getElementById('userAvatarBtn');
  if (userAvatarBtn) {
    userAvatarBtn.addEventListener('click', function() {
      const dropdown = document.getElementById('userDropdown');
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });
  }

  // Profile settings
  const profileSettingsBtn = document.getElementById('profileSettingsBtn');
  if (profileSettingsBtn) {
    profileSettingsBtn.addEventListener('click', function() {
      openProfileSettings();
    });
  }

  // Change password
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', function() {
      // Implement change password functionality
      alert('Change password functionality coming soon.');
    });
  }

  // Logout buttons
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  if (logoutDropdownBtn) {
    logoutDropdownBtn.addEventListener('click', handleLogout);
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('userDropdown');
    const userAvatarBtn = document.getElementById('userAvatarBtn');
    if (dropdown && userAvatarBtn && !userAvatarBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

// Handle logout
async function handleLogout() {
  try {
    await firebase.auth().signOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Logout failed. Please try again.');
  }
}

// Initialize page-specific functionality
function initializePage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  switch(currentPage) {
    case 'index.html':
    case '':
      // Index page is already handled by DOMContentLoaded
      break;
    case 'admin-dashboard.html':
      setupAdminDashboard();
      break;
    case 'dashboard.html':
      setupUserDashboard();
      // Load user data if logged in
      firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
          loadUserProfile(user.uid, user);
          loadUserComplaints(user.uid);
          loadUserStats(user.uid);
        } else {
          window.location.href = 'login.html';
        }
      });
      break;
    case 'login.html':
      // Login form is already handled
      break;
    case 'register.html':
      // Register form is already handled
      break;
    case 'complaint.html':
      // Complaint form is already handled
      break;
    case 'anonymous.html':
      // Anonymous complaint form is already handled
      break;
    case 'status.html':
      // Status form is already handled
      break;
  }
}

// Test function to manually trigger rating interface (for debugging)
function testRatingInterface() {
  console.log('Testing rating interface...');
  
  // Create a mock complaint data for testing
  const mockComplaint = {
    id: 'test-complaint-123',
    status: 'resolved',
    token: 'TEST123',
    type: 'Test Complaint',
    description: 'This is a test complaint for debugging',
    studentRating: null
  };
  
  console.log('Mock complaint data:', mockComplaint);
  
  // Try to show the rating interface
  showRatingInterface('test-complaint-123', mockComplaint);
}

