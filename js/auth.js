let contract;
let account;
let web3;

// Loading overlay functions
function showLoader() {
  document.getElementById("loadingOverlay").style.display = "flex";
}

function hideLoader() {
  document.getElementById("loadingOverlay").style.display = "none";
}
 
async function loadContract() {
  showLoader(); // Show loader when starting to load contract
  
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      account = accounts[0];
      // For MetaMask interactions use window.ethereum provider:
      web3 = new Web3(window.ethereum);
 
      const contractAddress = "0x686b2F6f4aF473eF13F2BFE25889C096131fDD43";
 
      const response = await fetch("json/registrationABI.json");
      const abi = await response.json();
      contract = new web3.eth.Contract(abi, contractAddress);
      console.log("Contract Loaded:", contract);
      
      hideLoader(); // Hide loader after contract is loaded
    } catch (error) {
      console.error("Error connecting to MetaMask or contract:", error);
      hideLoader(); // Hide loader if there's an error
      
      // Show error message
      Swal.fire({
        icon: "error",
        title: "Connection Error",
        text: "Failed to connect to Ethereum network. Please make sure MetaMask is installed and unlocked.",
      });
    }
  } else {
    hideLoader(); // Hide loader if MetaMask is not detected
    alert("MetaMask not detected. Please install it!");
  }
}
 
function toggleView(viewToShow) {
  if (viewToShow === "loginView") {
    document.getElementById("loginView").style.display = "block";
    document.getElementById("registerView").style.display = "none";
  } else {
    document.getElementById("loginView").style.display = "none";
    document.getElementById("registerView").style.display = "block";
  }
}
 
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("switchToRegister")
    .addEventListener("click", function (e) {
      e.preventDefault();
      toggleView("registerView");
    });
  document
    .getElementById("switchToLogin")
    .addEventListener("click", function (e) {
      e.preventDefault();
      toggleView("loginView");
    });
});
 
function togglePassword(fieldId, icon) {
  const input = document.getElementById(fieldId);
  const type = input.type === 'password' ? 'text' : 'password';
  input.type = type;
  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
}
 
// ================== Generate Unique ID ==================
function generateUniqueId(role, email) {
  const rolePrefixes = {
    Manufacturer: "MFG",
    Wholesaler: "WHL",
    Pharmacy: "PMC",
  };
  const prefix = rolePrefixes[role] || "USR";
 
  let storedId = localStorage.getItem(`userId_${email}`);
  if (storedId) return storedId;
 
  const randomNum = Math.floor(100 + Math.random() * 900);
  const uniqueId = `${prefix}${randomNum}`;
 
  localStorage.setItem(`userId_${email}`, uniqueId);
  return uniqueId;
}
 
// Password validation function
function validatePassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}
 
async function registerUser(event) {
  event.preventDefault();
  showLoader(); // Show loader when registration starts
 
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const role = document.getElementById("role").value;
  const password = document.getElementById("password").value;
  const terms = document.getElementById("terms").checked;
 
  if (!validatePassword(password)) {
    hideLoader(); // Hide loader if validation fails
    Swal.fire({
      icon: "error",
      title: "Password Requirements",
      text: "Password must be at least 8 characters long, include uppercase, lowercase, a number, and a special character.",
    });
    return;
  }
 
  const existingPassword = localStorage.getItem("userPassword");
  if (existingPassword && existingPassword === password) {
    hideLoader(); // Hide loader if validation fails
    Swal.fire({
      icon: "error",
      title: "Password Reuse Detected",
      text: "Please do not use the same password across multiple accounts.",
    });
    return;
  }
 
  const addressDetails = {
    street: "",
    city: "",
    state: "",
    zip: "",
  };
 
  const id = generateUniqueId(role, email);
  const userInput = {
    id: id,
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone: phone,
    role: role,
    password: password,
    terms: terms,
    addressDetails: addressDetails,
  };
 
  try {
    await contract.methods.register(userInput).send({ from: account });

    await fetch("https://emailsenderservice-springboot-production.up.railway.app/sendWelcomeEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        name: `${firstName} ${lastName}`,
        role: role,
        userId: id
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to send welcome email");
      }
      return response.text();
    })
    .then(data => console.log("Welcome email response:", data))
    .catch(error => console.error("Email send error:", error));
    
    hideLoader(); // Hide loader on success
    Swal.fire({
      icon: "success",
      title: "Registration Successful!",
      text: "You have successfully registered.",
      confirmButtonText: "Proceed",
    }).then(() => {
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userPassword", password);
      localStorage.setItem("userWalletAddress", account);
      localStorage.setItem("loginTimestamp", Date.now());
      window.location.href = "user.html";
    });
  } catch (error) {
    console.error("Registration Error:", error);
    hideLoader(); // Hide loader on error
    Swal.fire({
      icon: "error",
      title: "Oops!",
      text: "Something went wrong. Please try registering again.",
    });    
  }
}
 
async function loginUser(event) {
  event.preventDefault();
  showLoader(); // Show loader when login starts
 
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
 
  try {
    if (!account) {
      const accounts = await web3.eth.getAccounts();
      account = accounts[0];
    }
 
    let deactivatedAt = await contract.methods
      .getDeactivationTimestamp(email)
      .call();
    const currentTime = Math.floor(Date.now() / 1000);
    const THIRTY_DAYS = 30 * 24 * 60 * 60;
 
    if (parseInt(deactivatedAt) > 0) {
      if (currentTime < parseInt(deactivatedAt) + THIRTY_DAYS) {
        hideLoader(); // Hide loader for deactivated account
        Swal.fire({
          icon: "error",
          title: "Account Deactivated",
          text: "Your account is deactivated. Please wait until 30 days have passed to reactivate.",
        });
        return;
      } else {
        await contract.methods
          .reactivateAccount(email, password)
          .send({ from: account });
        hideLoader(); // Hide loader after reactivation
        Swal.fire({
          icon: "info",
          title: "Account Reactivated",
          text: "Your account has been reactivated. Logging you in...",
        });
        showLoader(); // Show loader again as we continue with login
      }
    }
 
    await contract.methods.login(email, password).send({ from: account });
    const userDetails = await contract.methods
      .getUserDetails(email, password)
      .call();
    localStorage.setItem(`userId_${email}`, userDetails.id);
 
    hideLoader(); // Hide loader on success
    Swal.fire({
      icon: "success",
      title: "Login Successful!",
      text: "You have successfully logged in.",
      confirmButtonText: "Proceed",
    }).then(() => {
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userPassword", password);
      localStorage.setItem("userWalletAddress", account);
      localStorage.setItem("loginTimestamp", Date.now());
      window.location.href = "user.html";
    });
  } catch (error) {
    console.error("Login Error:", error);
    hideLoader(); // Hide loader on error
    Swal.fire({
      icon: "error",
      title: "Login Failed",
      text: "We couldn't log you in. Please check your credentials and try again.",
    });    
  }
}
 
document
  .getElementById("forgotPasswordForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    showLoader(); // Show loader when password reset starts
    const email = document.getElementById("forgotPasswordEmail").value;
 
    try {
      // Check that the Ethereum provider is available.
      if (!window.ethereum) {
        hideLoader(); // Hide loader if Ethereum is not available
        throw new Error(
          "Ethereum wallet is not available. Please install MetaMask."
        );
      }
 
      // Request user's Ethereum accounts.
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const userAddress = accounts[0];
 
      // --- Step 1: Request Password Reset Token ---
      // Call requestPasswordReset with a transaction to store the token on-chain.
      await contract.methods
        .requestPasswordReset(email)
        .send({ from: userAddress });
 
      // Retrieve the stored reset token using the new getter function.
      const token = await contract.methods.getStoredResetToken(email).call();
      console.log("Reset token:", token);
 
      // --- Step 2: Send token and email to your backend ---
      const response = await fetch(
        "https://emailsenderservice-springboot-production.up.railway.app/sendResetEmail",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, token }),
        }
      );
      if (!response.ok) {
        hideLoader(); // Hide loader if email sending fails
        throw new Error(
          "Failed to send reset email. Status: " + response.status
        );
      }
      hideLoader(); // Hide loader on success
      Swal.fire("Success!", "Reset link sent to your email.", "success");
 
      // --- Step 3: Update Modal with Reset Password Form ---
      const modalBody = document.querySelector(
        "#forgotPasswordModal .modal-body"
      );
      modalBody.innerHTML = `
      <form id="resetPasswordForm">
        <div class="mb-3">
          <label for="resetEmail" class="form-label">Email</label>
          <input type="email" class="form-control" id="resetEmail" value="${email}" readonly>
        </div>
        <div class="mb-3">
          <label for="resetToken" class="form-label">Reset Token</label>
          <input type="text" class="form-control" id="resetToken" placeholder="Enter Reset Token" required>
        </div>
        <div class="mb-3">
          <label for="newPassword" class="form-label">New Password</label>
          <input type="password" class="form-control" id="newPassword" placeholder="Enter new password" required>
        </div>
        <div class="mb-3">
          <label for="confirmPassword" class="form-label">Confirm Password</label>
          <input type="password" class="form-control" id="confirmPassword" placeholder="Confirm new password" required>
        </div>
        <button type="submit" class="btn btn-primary">Reset Password</button>
      </form>
    `;
 
      // --- Step 4: Handle Reset Password Form Submission ---
      document
        .getElementById("resetPasswordForm")
        .addEventListener("submit", async (e) => {
          e.preventDefault();
          showLoader(); // Show loader when password reset form is submitted
          const resetEmail = document.getElementById("resetEmail").value;
          const resetToken = document.getElementById("resetToken").value;
          const newPassword = document.getElementById("newPassword").value;
          const confirmPassword =
            document.getElementById("confirmPassword").value;
 
          if (newPassword !== confirmPassword) {
            hideLoader(); // Hide loader if passwords don't match
            Swal.fire("Error", "Passwords do not match.", "error");
            return;
          }
 
          try {
            // Call the contract's resetPassword function via a transaction.
            const resetReceipt = await contract.methods
              .resetPassword(resetEmail, newPassword, resetToken)
              .send({ from: userAddress });
            console.log("Reset receipt:", resetReceipt);
            hideLoader(); // Hide loader on success
            Swal.fire("Success", "Your password has been reset.", "success");
 
            // Optionally, close the modal after successful reset.
            const modalEl = document.getElementById("forgotPasswordModal");
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();
          } catch (resetError) {
            console.error("Error during password reset:", resetError);
            hideLoader(); // Hide loader on error
            Swal.fire(
              "Error",
              "Failed to reset password on blockchain.",
              "error"
            );
          }
        });
    } catch (error) {
      console.error("Error during password reset:", error);
      hideLoader(); // Hide loader on error
      Swal.fire(
        "Error",
        error.message || "An error occurred during password reset.",
        "error"
      );
    }
  });
 
window.onload = loadContract;