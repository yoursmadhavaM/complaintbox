// Firebase compat initialization (for use with CDN scripts in all HTML files)
const firebaseConfig = {
  apiKey: "AIzaSyA-6DIng7Df8HmbE6KX5e8UxyGCIEPxxEk",
  authDomain: "anonymous-complaint-box.firebaseapp.com",
  projectId: "anonymous-complaint-box",
  storageBucket: "anonymous-complaint-box.appspot.com",
  messagingSenderId: "573878297184",
  appId: "1:573878297184:web:f5ee4ce9f6b7776e3cd905",
  measurementId: "G-5V8NQ941N9"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Generate unique token function
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Test Firebase configuration
function testFirebaseConfig() {
  console.log('Testing Firebase configuration...');
  console.log('Firebase config:', firebaseConfig);
  console.log('Firebase app initialized:', firebase.apps.length > 0);
  console.log('Firestore available:', !!db);
  console.log('Auth available:', !!auth);
  console.log('Storage available:', !!storage);
  
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

// --- Modal and Announcement Logic (shared) ---
function setupAnnouncementBar() {
  console.log('[DEBUG] setupAnnouncementBar called');
  const announcementBar = document.getElementById('announcementBar');
  if (!announcementBar) {
    console.log('[DEBUG] announcementBar div not found');
    return;
  }
  // If on index.html or dashboard, use ticker style
  const isIndex = getPage() === 'index';
  const isDashboard = getPage() === 'dashboard';
  // Always show announcement bar with default content
  announcementBar.style.display = 'block';
  
  db.collection('announcements')
    .where('status', '==', 'approved')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
    .then(snapshot => {
      console.log('[DEBUG] Firestore query complete. Docs found:', snapshot.size);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        console.log('[DEBUG] Announcement data:', data);
        if (isIndex || isDashboard) {
          announcementBar.classList.add('announcement-ticker');
          announcementBar.innerHTML = `<span class="alert-icon"><i class="fa-solid fa-triangle-exclamation"></i></span><span class='ticker-content'>${data.text}</span>`;
        } else {
          announcementBar.classList.remove('announcement-ticker');
          announcementBar.innerHTML = `<span class=\"alert-icon\"><i class=\"fa-solid fa-triangle-exclamation\"></i></span> ${data.text}`;
        }
      } else {
        console.log('[DEBUG] No approved announcements found');
        // Show default welcome message
        if (isIndex || isDashboard) {
          announcementBar.classList.add('announcement-ticker');
          announcementBar.innerHTML = `<span class="alert-icon"><i class="fa-solid fa-info-circle"></i></span><span class='ticker-content'>Welcome to RVR & JC College of Engineering Complaint Box</span>`;
        } else {
          announcementBar.classList.remove('announcement-ticker');
          announcementBar.innerHTML = `<span class="alert-icon"><i class="fa-solid fa-info-circle"></i></span> Welcome to RVR & JC College of Engineering Complaint Box`;
        }
      }
    })
    .catch((err) => {
      console.log('[DEBUG] Firestore query error:', err);
      // Show default welcome message on error
      if (isIndex || isDashboard) {
        announcementBar.classList.add('announcement-ticker');
        announcementBar.innerHTML = `<span class="alert-icon"><i class="fa-solid fa-info-circle"></i></span><span class='ticker-content'>Welcome to RVR & JC College of Engineering Complaint Box</span>`;
      } else {
        announcementBar.classList.remove('announcement-ticker');
        announcementBar.innerHTML = `<span class="alert-icon"><i class="fa-solid fa-info-circle"></i></span> Welcome to RVR & JC College of Engineering Complaint Box`;
      }
    });
}

function setupAnnouncementRequestModal() {
  const requestAnnouncementBtn = document.getElementById('requestAnnouncementBtn');
  const announcementModal = document.getElementById('announcementModal');
  const closeAnnouncementModalBtn = document.getElementById('closeAnnouncementModalBtn');
  const announcementRequestForm = document.getElementById('announcementRequestForm');
  const announcementRequestResult = document.getElementById('announcementRequestResult');
  const loginRequiredModal = document.getElementById('loginRequiredModal');
  const closeLoginRequiredModalBtn = document.getElementById('closeLoginRequiredModalBtn');
  const goToLoginBtn = document.getElementById('goToLoginBtn');
  const cancelLoginRequiredBtn = document.getElementById('cancelLoginRequiredBtn');
  
  if (!requestAnnouncementBtn || !announcementModal || !closeAnnouncementModalBtn) return;
  
  // Handle login required modal
  if (loginRequiredModal && closeLoginRequiredModalBtn && goToLoginBtn && cancelLoginRequiredBtn) {
    closeLoginRequiredModalBtn.onclick = function() {
      loginRequiredModal.style.display = 'none';
    };
    goToLoginBtn.onclick = function() {
      loginRequiredModal.style.display = 'none';
      window.location.href = 'login.html';
    };
    cancelLoginRequiredBtn.onclick = function() {
      loginRequiredModal.style.display = 'none';
    };
    loginRequiredModal.addEventListener('click', function(e) {
      if (e.target === loginRequiredModal) {
        loginRequiredModal.style.display = 'none';
      }
    });
  }
  
  requestAnnouncementBtn.onclick = function() {
    // Check if user is logged in
    const user = auth.currentUser;
    if (!user) {
      // Show login required modal
      if (loginRequiredModal) {
        loginRequiredModal.style.display = 'flex';
      }
      return;
    }
    
    // User is logged in, show announcement request modal
    announcementModal.style.display = 'flex';
    if (announcementRequestResult) announcementRequestResult.textContent = '';
  };
  
  closeAnnouncementModalBtn.onclick = function() {
    announcementModal.style.display = 'none';
  };
  
  announcementModal.addEventListener('click', function(e) {
    if (e.target === announcementModal) announcementModal.style.display = 'none';
  });
  
  if (announcementRequestForm) {
    announcementRequestForm.onsubmit = async function(e) {
      e.preventDefault();
      
      // Double-check authentication
      const user = auth.currentUser;
      if (!user) {
        if (announcementRequestResult) {
          announcementRequestResult.style.color = '#e53935';
          announcementRequestResult.textContent = 'Please log in to submit announcement requests.';
        }
        return;
      }
      
      const text = document.getElementById('announcementText').value.trim();
      if (!text) {
        announcementRequestResult.textContent = 'Please enter an announcement request.';
        announcementRequestResult.className = 'result-message error';
        return;
      }

      try {
        await db.collection('announcements').add({
          text,
          status: 'pending',
          createdBy: user.uid,
          userEmail: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (announcementRequestResult) {
          announcementRequestResult.style.color = '#388e3c';
          announcementRequestResult.textContent = 'Announcement request submitted! Awaiting admin approval.';
        }
        announcementRequestForm.reset();
      } catch (err) {
        if (announcementRequestResult) {
          announcementRequestResult.style.color = '#e53935';
          announcementRequestResult.textContent = 'Failed to submit request.';
        }
      }
    };
  }
}

// --- Index (Complaint Submission) Page Logic ---
function setupIndexPage() {
  const authModal = document.getElementById('authModal');
  const complaintForm = document.getElementById('complaintForm');
  const complaintTitle = document.getElementById('complaintTitle');
  const tokenSection = document.getElementById('tokenSection');
  const requestAnnouncementBtn = document.getElementById('requestAnnouncementBtn');
  const loginRequiredModal = document.getElementById('loginRequiredModal');
  const announcementModal = document.getElementById('announcementModal');
  const announcementRequestForm = document.getElementById('announcementRequestForm');
  const closeLoginRequiredModal = document.getElementById('closeLoginRequiredModal');
  const closeAnnouncementModal = document.getElementById('closeAnnouncementModal');
  const cancelAnnouncementBtn = document.getElementById('cancelAnnouncementBtn');
  const announcementRequestResult = document.getElementById('announcementRequestResult');

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

  // Check authentication state for announcement request button
  auth.onAuthStateChanged(function(user) {
    if (user && requestAnnouncementBtn) {
      requestAnnouncementBtn.classList.add('show');
    } else if (requestAnnouncementBtn) {
      requestAnnouncementBtn.classList.remove('show');
    }
  });

  // Announcement request button
  if (requestAnnouncementBtn) {
    requestAnnouncementBtn.onclick = function() {
      if (auth.currentUser) {
        announcementModal.style.display = 'flex';
      } else {
        loginRequiredModal.style.display = 'flex';
      }
    };
  }

  // Close login required modal
  if (closeLoginRequiredModal) {
    closeLoginRequiredModal.onclick = function() {
      loginRequiredModal.style.display = 'none';
    };
  }

  // Close announcement modal
  if (closeAnnouncementModal) {
    closeAnnouncementModal.onclick = function() {
      announcementModal.style.display = 'none';
    };
  }

  // Cancel announcement button
  if (cancelAnnouncementBtn) {
    cancelAnnouncementBtn.onclick = function() {
      announcementModal.style.display = 'none';
    };
  }

  // Announcement request form
  if (announcementRequestForm) {
    announcementRequestForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const announcementText = document.getElementById('announcementText').value.trim();
      
      if (!announcementText) {
        announcementRequestResult.textContent = 'Please enter an announcement request.';
        announcementRequestResult.className = 'result-message error';
        return;
      }

      try {
        await db.collection('announcements').add({
          text: announcementText,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: auth.currentUser.uid,
          userEmail: auth.currentUser.email
        });

        announcementRequestResult.textContent = 'Announcement request submitted successfully!';
        announcementRequestResult.className = 'result-message success';
        
        setTimeout(() => {
          announcementModal.style.display = 'none';
          announcementRequestForm.reset();
          announcementRequestResult.textContent = '';
          announcementRequestResult.className = '';
        }, 2000);
        
      } catch (err) {
        console.error('Error submitting announcement request:', err);
        announcementRequestResult.textContent = 'Failed to submit announcement request. Please try again.';
        announcementRequestResult.className = 'result-message error';
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
  [loginRequiredModal, announcementModal, statusModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
  });

  // Setup announcement bar
  setupAnnouncementBar();
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
      
      const token = window.currentComplaintData.token || document.getElementById('token').value.trim();
      if (!token) {
        bounceResult.innerHTML = '<span style="color: #f44336;">No valid token found.</span>';
        return;
      }
      
      bounceResult.innerHTML = '<span style="color: #2196f3;">Processing bounce...</span>';
      
      try {
        const success = await bounceToken(token, window.currentComplaintData);
        
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
  if (sidebar && sections.length) {
    sidebar.addEventListener('click', function(e) {
      const li = e.target.closest('li[data-section]');
      if (!li) return;
      sidebar.querySelectorAll('li').forEach(item => item.classList.remove('active'));
      li.classList.add('active');
      sections.forEach(section => {
        section.style.display = section.id === li.dataset.section + 'Section' ? 'block' : 'none';
      });
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
        loadAnnouncements();
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
  
  // Announcement bar
  setupAnnouncementBar();
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

// Load announcements
async function loadAnnouncements() {
  const announcementsList = document.getElementById('announcementsList');
  if (!announcementsList) return;
  
  try {
    const snapshot = await db.collection('announcements')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      announcementsList.innerHTML = '<div class="no-data">No announcements available.</div>';
      return;
    }
    
    const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    announcementsList.innerHTML = announcements.map(announcement => `
      <div class="announcement-item">
        <div class="announcement-text">${announcement.text}</div>
        <div class="announcement-date">${announcement.createdAt ? new Date(announcement.createdAt.toDate()).toLocaleDateString() : 'N/A'}</div>
      </div>
    `).join('');
  } catch (err) {
    announcementsList.innerHTML = '<div class="error">Failed to load announcements.</div>';
    console.error('Error loading announcements:', err);
  }
}

// Setup action buttons
function setupActionButtons() {
  const newComplaintBtn = document.getElementById('newComplaintBtn');
  const checkStatusBtn = document.getElementById('checkStatusBtn');
  const requestAnnouncementBtn = document.getElementById('requestAnnouncementBtn');
  
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
  
  if (requestAnnouncementBtn) {
    requestAnnouncementBtn.onclick = function() {
      document.getElementById('announcementRequestModal').style.display = 'flex';
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
  
  // Announcement Request Modal
  const announcementRequestModal = document.getElementById('announcementRequestModal');
  const closeAnnouncementRequestModal = document.getElementById('closeAnnouncementRequestModal');
  const announcementRequestForm = document.getElementById('announcementRequestForm');
  const cancelAnnouncementBtn = document.getElementById('cancelAnnouncementBtn');
  
  if (closeAnnouncementRequestModal) {
    closeAnnouncementRequestModal.onclick = function() {
      announcementRequestModal.style.display = 'none';
    };
  }
  
  if (cancelAnnouncementBtn) {
    cancelAnnouncementBtn.onclick = function() {
      announcementRequestModal.style.display = 'none';
    };
  }
  
  if (announcementRequestForm) {
    announcementRequestForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const text = document.getElementById('announcementText').value.trim();
      const resultElement = document.getElementById('announcementRequestResult');
      
      try {
        await db.collection('announcements').add({
          text,
          status: 'pending',
          createdBy: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        resultElement.textContent = 'Announcement request submitted! Awaiting admin approval.';
        resultElement.className = 'result-message success';
        announcementRequestForm.reset();
      } catch (err) {
        resultElement.textContent = 'Failed to submit request.';
        resultElement.className = 'result-message error';
      }
    };
  }
  
  // Close modals when clicking outside
  [newComplaintModal, statusCheckModal, announcementRequestModal].forEach(modal => {
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

// --- Admin: Load Pending Announcement Requests ---
async function loadAdminAnnouncementRequests() {
  const listDiv = document.getElementById('adminAnnouncementRequestsList');
  if (!listDiv) return;
  listDiv.textContent = 'Loading requests...';
  try {
    const snapshot = await db.collection('announcements')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    if (snapshot.empty) {
      listDiv.textContent = 'No pending announcement requests.';
      return;
    }
    listDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'admin-announcement-request';
      div.style.marginBottom = '14px';
      div.style.padding = '10px 14px';
      div.style.background = '#fff3e0';
      div.style.border = '1px solid #ffb74d';
      div.style.borderRadius = '6px';
      div.innerHTML = `<b>Request:</b> ${data.text}<br><small>Submitted: ${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}</small><br>` +
        `<button class='btn-approve' style='margin-right:8px;'>Approve</button>` +
        `<button class='btn-delete'>Delete</button>`;
      // Approve button
      div.querySelector('.btn-approve').onclick = async function() {
        try {
          // Check if user is authenticated
          const user = auth.currentUser;
          if (!user) {
            alert('Please log in to perform this action.');
            return;
          }
          
          await db.collection('announcements').doc(doc.id).update({ 
            status: 'approved', 
            createdBy: 'admin',
            approvedBy: user.uid,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          loadAdminAnnouncementRequests();
          if (typeof loadAdminAnnouncements === 'function') loadAdminAnnouncements();
        } catch (error) {
          console.error('Error approving announcement:', error);
          alert('Failed to approve announcement. Please try again.');
        }
      };
      // Delete button
      div.querySelector('.btn-delete').onclick = async function() {
        try {
          // Check if user is authenticated
          const user = auth.currentUser;
          if (!user) {
            alert('Please log in to perform this action.');
            return;
          }
          
          await db.collection('announcements').doc(doc.id).delete();
          loadAdminAnnouncementRequests();
        } catch (error) {
          console.error('Error deleting announcement:', error);
          alert('Failed to delete announcement. Please try again.');
        }
      };
      listDiv.appendChild(div);
    });
  } catch (err) {
    console.error('Error loading admin announcement requests:', err);
    listDiv.textContent = 'Failed to load requests. Error: ' + err.message;
  }
}

// --- Admin: Load Approved Announcements ---
async function loadAdminAnnouncements() {
  const listDiv = document.getElementById('adminAnnouncementsList');
  if (!listDiv) return;
  listDiv.textContent = 'Loading announcements...';
  try {
    const snapshot = await db.collection('announcements')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .get();
    if (snapshot.empty) {
      listDiv.textContent = 'No announcements.';
      return;
    }
    listDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'admin-announcement';
      div.style.marginBottom = '14px';
      div.style.padding = '10px 14px';
      div.style.background = '#e3f2fd';
      div.style.border = '1px solid #64b5f6';
      div.style.borderRadius = '6px';
      div.innerHTML = `<b>Announcement:</b> ${data.text}<br><small>Created: ${data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : ''}</small><br>` +
        `<button class='btn-delete'>Delete</button>`;
      // Delete button
      div.querySelector('.btn-delete').onclick = async function() {
        try {
          // Check if user is authenticated
          const user = auth.currentUser;
          if (!user) {
            alert('Please log in to perform this action.');
            return;
          }
          
          await db.collection('announcements').doc(doc.id).delete();
          loadAdminAnnouncements();
        } catch (error) {
          console.error('Error deleting announcement:', error);
          alert('Failed to delete announcement. Please try again.');
        }
      };
      listDiv.appendChild(div);
    });
  } catch (err) {
    console.error('Error loading admin announcements:', err);
    listDiv.textContent = 'Failed to load announcements. Error: ' + err.message;
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
    // Start with a basic query - just get all complaints
    let query = db.collection('complaints');
    
    // Apply status filter if specified
    if (statusFilter) {
      query = query.where('status', '==', statusFilter);
    }

    // Get the snapshot
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const tableBody = document.getElementById('complaintsTableBody');
    if (!tableBody) return;

    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="6">No complaints found.</td></tr>';
      return;
    }

    // Filter the results in JavaScript to avoid complex Firestore queries
    let filteredDocs = snapshot.docs;
    
    // Apply type filter in JavaScript
    if (typeFilter) {
      filteredDocs = filteredDocs.filter(doc => {
        const data = doc.data();
        return data.complaintType === typeFilter;
      });
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
    }

    // Display filtered results
    if (filteredDocs.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">No complaints found with the selected filters.</td></tr>';
      return;
    }

    tableBody.innerHTML = '';
    filteredDocs.forEach(doc => {
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
          const user = auth.currentUser;
          if (!user) {
            alert('Please log in to perform this action.');
            return;
          }
          await db.collection('complaints').doc(doc.id).delete();
          loadAdminComplaintsWithFilters();
        } catch (error) {
          console.error('Error deleting complaint:', error);
          alert('Failed to delete complaint. Please try again.');
        }
      };
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load filtered complaints:', err);
    const tableBody = document.getElementById('complaintsTableBody');
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="6">Failed to load complaints. Error: ' + err.message + '</td></tr>';
    }
  }
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
  
  // Load admin data directly
  setupSidebar();
  setupAnnouncementBar();
  loadAdminAnnouncementRequests();
  loadAdminAnnouncements();
  loadAdminComplaints();
  loadAdminResolvedComplaints();
  loadAdminTokens();
  loadBouncedComplaints();
  loadCurrentUserCredits();
  
  // Show dashboard on button click
  const adminWelcomeModal = document.getElementById('adminWelcomeModal');
  const adminEnterBtn = document.getElementById('adminEnterBtn');
  const dashboardContainer = document.querySelector('.dashboard-container');
  if (adminWelcomeModal && adminEnterBtn && dashboardContainer) {
    adminEnterBtn.onclick = function() {
      adminWelcomeModal.style.display = 'none';
      dashboardContainer.style.display = '';
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
        // Update complaint status
        await db.collection('complaints').doc(resolveComplaintId).update({ 
          status: 'resolved', 
          resolutionDescription: desc,
          resolvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update user credits if this is a re-resolution of a bounced complaint
        const complaintDoc = await db.collection('complaints').doc(resolveComplaintId).get();
        if (complaintDoc.exists) {
          const complaintData = complaintDoc.data();
          if (complaintData.status === 'bounced' && complaintData.email) {
            await updateUserCredits(complaintData.email, 'bounced_re_resolved');
          } else if (complaintData.email) {
            await updateUserCredits(complaintData.email, 'complaint_resolved');
          }
        }
        
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

  // Admin announcement submission logic and refresh button setup
  const adminAnnouncementForm = document.getElementById('adminAnnouncementForm');
  const adminAnnouncementText = document.getElementById('adminAnnouncementText');
  const adminAnnouncementResult = document.getElementById('adminAnnouncementResult');
  if (adminAnnouncementForm && adminAnnouncementText) {
    adminAnnouncementForm.onsubmit = async function(e) {
      e.preventDefault();
      const text = adminAnnouncementText.value.trim();
      if (!text) return;
      try {
        await db.collection('announcements').add({
          text,
          status: 'approved',
          createdBy: 'admin',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        adminAnnouncementText.value = '';
        if (adminAnnouncementResult) {
          adminAnnouncementResult.color = '#388e3c';
          adminAnnouncementResult.textContent = 'Announcement added and visible to users!';
          setTimeout(() => { adminAnnouncementResult.textContent = ''; }, 3000);
        }
        setupAnnouncementBar(); // Refresh announcement bar for admin
        loadAdminAnnouncements(); // Refresh admin's own list
      } catch (err) {
        if (adminAnnouncementResult) {
          adminAnnouncementResult.color = '#e53935';
          adminAnnouncementResult.textContent = 'Failed to add announcement.';
          setTimeout(() => { adminAnnouncementResult.textContent = ''; }, 3000);
        }
      }
    };
  }

  // Setup filter functionality
  setupAdminFilters();
  
  // Setup statistics functionality
  setupAdminStatistics();
  
  // Setup report generation
  setupAdminReports();
  
  // Setup credit system
  setupAdminCreditSystem();

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.onclick = function() {
      loadAdminAnnouncementRequests();
      loadAdminAnnouncements();
      loadAdminComplaintsWithFilters();
      loadAdminResolvedComplaints();
      loadAdminTokens();
      loadBouncedComplaints();
      loadAdminStatistics();
    };
  }
}

// --- Admin: Setup Filter Functionality ---
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
function setupAdminCreditSystem() {
  // Admin credit password access
  const accessCreditReportsBtn = document.getElementById('accessCreditReportsBtn');
  const adminCreditPassword = document.getElementById('adminCreditPassword');
  const creditAccessResult = document.getElementById('creditAccessResult');
  
  if (accessCreditReportsBtn) {
    accessCreditReportsBtn.onclick = function() {
      const password = adminCreditPassword.value;
      if (password === 'rvrjc7') {
        // Show credit reports section
        document.getElementById('creditReportsSection').style.display = 'block';
        document.getElementById('regularCreditsDisplay').style.display = 'none';
        
        // Load admin credit reports
        loadAdminCreditReports();
        
        // Clear password and show success
        adminCreditPassword.value = '';
        creditAccessResult.innerHTML = '<span style="color: #4caf50;">✓ Access granted! Credit reports loaded.</span>';
        
        // Hide result after 3 seconds
        setTimeout(() => {
          creditAccessResult.innerHTML = '';
        }, 3000);
      } else {
        creditAccessResult.innerHTML = '<span style="color: #f44336;">✗ Incorrect password. Please try again.</span>';
        adminCreditPassword.value = '';
      }
    };
  }
  
  // Enter key support for password
  if (adminCreditPassword) {
    adminCreditPassword.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        accessCreditReportsBtn.click();
      }
    });
  }
}

// --- Admin: Load All Tokens ---
async function loadAdminTokens() {
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
    snapshot.forEach(doc => {
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
}

// --- Credit System Functions ---

// Initialize user credits
async function initializeUserCredits(userEmail) {
  try {
    const userDoc = await db.collection('users').doc(userEmail).get();
    if (!userDoc.exists) {
      // Create new user with initial credits
      await db.collection('users').doc(userEmail).set({
        email: userEmail,
        creditScore: 10.0,
        complaintsSubmitted: 0,
        complaintsResolved: 0,
        complaintsBounced: 0,
        complaintsOverdue: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return 10.0;
    }
    return userDoc.data().creditScore || 10.0;
  } catch (error) {
    console.error('Error initializing user credits:', error);
    return 10.0;
  }
}

// Update user credits based on actions
async function updateUserCredits(userEmail, action, complaintId = null) {
  try {
    const userRef = db.collection('users').doc(userEmail);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      await initializeUserCredits(userEmail);
    }
    
    const userData = userDoc.data();
    let newCreditScore = userData.creditScore || 10.0;
    let updateData = {};
    
    switch (action) {
      case 'complaint_submitted':
        updateData = {
          complaintsSubmitted: firebase.firestore.FieldValue.increment(1)
        };
        break;
        
      case 'complaint_resolved':
        newCreditScore = Math.min(100, newCreditScore + 0.15);
        updateData = {
          creditScore: newCreditScore,
          complaintsResolved: firebase.firestore.FieldValue.increment(1)
        };
        break;
        
      case 'complaint_bounced':
        newCreditScore = Math.max(0, newCreditScore - 0.50);
        updateData = {
          creditScore: newCreditScore,
          complaintsBounced: firebase.firestore.FieldValue.increment(1)
        };
        break;
        
      case 'bounced_re_resolved':
        newCreditScore = Math.min(100, newCreditScore + 0.20);
        updateData = {
          creditScore: newCreditScore
        };
        break;
        
      case 'complaint_overdue':
        newCreditScore = Math.max(0, newCreditScore - 1.00);
        updateData = {
          creditScore: newCreditScore,
          complaintsOverdue: firebase.firestore.FieldValue.increment(1)
        };
        break;
    }
    
    await userRef.update(updateData);
    return newCreditScore;
    
  } catch (error) {
    console.error('Error updating user credits:', error);
    return null;
  }
}

// Check for overdue complaints and update credits
async function checkOverdueComplaints() {
  try {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const overdueSnapshot = await db.collection('complaints')
      .where('status', '==', 'pending')
      .where('createdAt', '<=', twoWeeksAgo)
      .get();
    
    overdueSnapshot.forEach(async (doc) => {
      const data = doc.data();
      if (data.email && data.status === 'pending') {
        await updateUserCredits(data.email, 'complaint_overdue', doc.id);
      }
    });
    
  } catch (error) {
    console.error('Error checking overdue complaints:', error);
  }
}

// Load user credits for display
async function loadUserCredits(userEmail) {
  try {
    const userDoc = await db.collection('users').doc(userEmail).get();
    if (!userDoc.exists) {
      await initializeUserCredits(userEmail);
    }
    
    const userData = userDoc.data();
    const creditInfo = document.getElementById('userCreditsInfo');
    
    if (creditInfo) {
      creditInfo.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #4caf50; font-size: 3rem;">${userData.creditScore || 10.0}</h2>
            <p style="margin: 5px 0 0 0; font-size: 1.1rem; color: #666;">Credit Points</p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <h4 style="margin: 0; color: #2196f3;">${userData.complaintsSubmitted || 0}</h4>
              <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Submitted</p>
            </div>
            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <h4 style="margin: 0; color: #4caf50;">${userData.complaintsResolved || 0}</h4>
              <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Resolved</p>
            </div>
            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <h4 style="margin: 0; color: #f44336;">${userData.complaintsBounced || 0}</h4>
              <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Bounced</p>
            </div>
            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <h4 style="margin: 0; color: #ff9800;">${userData.complaintsOverdue || 0}</h4>
              <p style="margin: 5px 0 0 0; font-size: 0.9rem;">Overdue</p>
            </div>
          </div>
        </div>
      `;
    }
    
  } catch (error) {
    console.error('Error loading user credits:', error);
    const creditInfo = document.getElementById('userCreditsInfo');
    if (creditInfo) {
      creditInfo.innerHTML = '<div style="color: #f44336;">Failed to load credit information.</div>';
    }
  }
}

// Load admin credit reports
async function loadAdminCreditReports() {
  try {
    // Load summary statistics
    const usersSnapshot = await db.collection('users').get();
    const bouncedSnapshot = await db.collection('bouncedComplaints').get();
    const overdueSnapshot = await db.collection('complaints')
      .where('status', '==', 'pending')
      .get();
    
    const totalUsers = usersSnapshot.size;
    let totalCredits = 0;
    let bouncedCount = 0;
    let overdueCount = 0;
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      totalCredits += userData.creditScore || 0;
    });
    
    bouncedSnapshot.forEach(doc => {
      bouncedCount++;
    });
    
    // Check for overdue complaints
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    overdueSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.createdAt && data.createdAt.toDate && data.createdAt.toDate() <= twoWeeksAgo) {
        overdueCount++;
      }
    });
    
    const avgCreditScore = totalUsers > 0 ? Math.round((totalCredits / totalUsers) * 100) / 100 : 0;
    
    // Update summary cards
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('avgCreditScore').textContent = avgCreditScore;
    document.getElementById('bouncedCount').textContent = bouncedCount;
    document.getElementById('overdueCount').textContent = overdueCount;
    
    // Load user credit details
    const tableBody = document.getElementById('userCreditsTableBody');
    if (tableBody) {
      tableBody.innerHTML = '';
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${userData.email || 'N/A'}</td>
          <td>${userData.name || 'N/A'}</td>
          <td><strong>${userData.creditScore || 10.0}</strong></td>
          <td>${userData.complaintsSubmitted || 0}</td>
          <td>${userData.complaintsResolved || 0}</td>
          <td>${userData.complaintsBounced || 0}</td>
          <td>${userData.complaintsOverdue || 0}</td>
          <td>
            <button class='btn-view' onclick="viewUserDetails('${userData.email}')">View</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    }
    
  } catch (error) {
    console.error('Error loading admin credit reports:', error);
  }
}

// View user details
function viewUserDetails(userEmail) {
  // This can be expanded to show detailed user information
  alert(`User: ${userEmail}\nDetailed user information can be displayed here.`);
}

// --- Bounce Token Functionality ---

// Show bounce button when complaint is resolved
function showBounceButton(complaintData) {
  const bounceSection = document.getElementById('bounceSection');
  if (bounceSection) {
    if (complaintData.status === 'resolved') {
      bounceSection.style.display = 'block';
      console.log('Bounce button shown for resolved complaint:', complaintData);
    } else {
      bounceSection.style.display = 'none';
      console.log('Bounce button hidden - complaint not resolved:', complaintData.status);
    }
  } else {
    console.log('Bounce section not found');
  }
}

// Bounce a token
async function bounceToken(token, complaintData) {
  try {
    console.log('Bouncing token:', token, 'for complaint:', complaintData);
    
    // Create bounced complaint record
    await db.collection('bouncedComplaints').add({
      token: token,
      complaintType: complaintData.complaintType,
      originalResolution: complaintData.resolutionDescription,
      originalComplaintId: complaintData.id,
      userEmail: complaintData.email,
      name: complaintData.name,
      isAnonymous: complaintData.isAnonymous,
      bouncedAt: firebase.firestore.FieldValue.serverTimestamp(),
      reason: 'User disagreed with resolution'
    });
    
    // Update user credits if user has email
    if (complaintData.email) {
      await updateUserCredits(complaintData.email, 'complaint_bounced');
      console.log('Updated credits for user:', complaintData.email);
    }
    
    // Update original complaint status
    await db.collection('complaints').doc(complaintData.id).update({
      status: 'bounced',
      bouncedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
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
    
    // Show bounce button if complaint is resolved
    showBounceButton(data);
    
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
  
  // Initialize credit system and check for overdue complaints
  if (page === 'admin' || page === 'user') {
    // Check for overdue complaints every hour
    checkOverdueComplaints();
    setInterval(checkOverdueComplaints, 60 * 60 * 1000); // Check every hour
  }
});

// --- Load Current User Credits for Admin ---
async function loadCurrentUserCredits() {
  try {
    // Get current user email from auth or localStorage
    let userEmail = '';
    
    if (firebase.auth().currentUser) {
      userEmail = firebase.auth().currentUser.email;
    } else {
      // Try to get from localStorage if not authenticated
      userEmail = localStorage.getItem('userEmail') || '';
    }
    
    if (!userEmail) {
      console.log('No user email found for credit display');
      return;
    }
    
    // Get user document from Firestore
    const userDoc = await db.collection('users').where('email', '==', userEmail).get();
    
    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      const creditScore = userData.creditScore || 10.0;
      const totalCredits = userData.totalCredits || 0;
      
      // Update the display elements
      const currentUserCredits = document.getElementById('currentUserCredits');
      const currentUserCreditScore = document.getElementById('currentUserCreditScore');
      
      if (currentUserCredits) {
        currentUserCredits.textContent = totalCredits.toFixed(2);
      }
      
      if (currentUserCreditScore) {
        currentUserCreditScore.textContent = creditScore.toFixed(2);
      }
      
      console.log('Current user credits loaded:', { email: userEmail, creditScore, totalCredits });
    } else {
      // Create user document if it doesn't exist
      await initializeUserCredits(userEmail);
      // Load credits again
      loadCurrentUserCredits();
    }
    
  } catch (error) {
    console.error('Error loading current user credits:', error);
  } 
     t r y   { 
         / /   G e t   c u r r e n t   u s e r   e m a i l   f r o m   a u t h   o r   l o c a l S t o r a g e 
         l e t   u s e r E m a i l   =   ' ' ; 
         
         i f   ( f i r e b a s e . a u t h ( ) . c u r r e n t U s e r )   { 
             u s e r E m a i l   =   f i r e b a s e . a u t h ( ) . c u r r e n t U s e r . e m a i l ; 
         }   e l s e   { 
             / /   T r y   t o   g e t   f r o m   l o c a l S t o r a g e   i f   n o t   a u t h e n t i c a t e d 
             u s e r E m a i l   =   l o c a l S t o r a g e . g e t I t e m ( ' u s e r E m a i l ' )   | |   ' ' ; 
         } 
         
         i f   ( ! u s e r E m a i l )   { 
             c o n s o l e . l o g ( ' N o   u s e r   e m a i l   f o u n d   f o r   c r e d i t   d i s p l a y ' ) ; 
             r e t u r n ; 
         } 
         
         / /   G e t   u s e r   d o c u m e n t   f r o m   F i r e s t o r e 
         c o n s t   u s e r D o c   =   a w a i t   d b . c o l l e c t i o n ( ' u s e r s ' ) . w h e r e ( ' e m a i l ' ,   ' = = ' ,   u s e r E m a i l ) . g e t ( ) ; 
         
         i f   ( ! u s e r D o c . e m p t y )   { 
             c o n s t   u s e r D a t a   =   u s e r D o c . d o c s [ 0 ] . d a t a ( ) ; 
             c o n s t   c r e d i t S c o r e   =   u s e r D a t a . c r e d i t S c o r e   | |   1 0 . 0 ; 
             c o n s t   t o t a l C r e d i t s   =   u s e r D a t a . t o t a l C r e d i t s   | |   0 ; 
             
             / /   U p d a t e   t h e   d i s p l a y   e l e m e n t s 
             c o n s t   c u r r e n t U s e r C r e d i t s   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' c u r r e n t U s e r C r e d i t s ' ) ; 
             c o n s t   c u r r e n t U s e r C r e d i t S c o r e   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' c u r r e n t U s e r C r e d i t S c o r e ' ) ; 
             
             i f   ( c u r r e n t U s e r C r e d i t s )   { 
                 c u r r e n t U s e r C r e d i t s . t e x t C o n t e n t   =   t o t a l C r e d i t s . t o F i x e d ( 2 ) ; 
             } 
             
             i f   ( c u r r e n t U s e r C r e d i t S c o r e )   { 
                 c u r r e n t U s e r C r e d i t S c o r e . t e x t C o n t e n t   =   c r e d i t S c o r e . t o F i x e d ( 2 ) ; 
             } 
             
             c o n s o l e . l o g ( ' C u r r e n t   u s e r   c r e d i t s   l o a d e d : ' ,   {   e m a i l :   u s e r E m a i l ,   c r e d i t S c o r e ,   t o t a l C r e d i t s   } ) ; 
         }   e l s e   { 
             / /   C r e a t e   u s e r   d o c u m e n t   i f   i t   d o e s n ' t   e x i s t 
             a w a i t   i n i t i a l i z e U s e r C r e d i t s ( u s e r E m a i l ) ; 
             / /   L o a d   c r e d i t s   a g a i n 
             l o a d C u r r e n t U s e r C r e d i t s ( ) ; 
         } 
         
     }   c a t c h   ( e r r o r )   { 
         c o n s o l e . e r r o r ( ' E r r o r   l o a d i n g   c u r r e n t   u s e r   c r e d i t s : ' ,   e r r o r ) ; 
     } 
 } 
 
 