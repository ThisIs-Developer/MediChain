// // ================== Session and Access Control ==================
// // Prevent direct access to user.html if not logged in, except on logout.html
// if (!window.location.href.includes("logout.html")) {
//   const email = localStorage.getItem("userEmail");
//   const password = localStorage.getItem("userPassword");
//   const loginTimestamp = localStorage.getItem("loginTimestamp");

//   const sessionDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
//   const currentTime = Date.now();

//   if (!email || !password || !loginTimestamp || currentTime - loginTimestamp > sessionDuration) {
//     localStorage.clear(); // Clear session if expired
//     window.location.href = "auth.html"; // Redirect to login page
//   } else {
//     // Update timestamp to extend session while active
//     localStorage.setItem("loginTimestamp", currentTime);
//   }
// }


// ================== Global Variables ==================
let web3;
let account;
let registrationContract; // For user details
let addMedicineContract; // For medicine functions
let contractABI; // ABI for medicine contract

// ================== Centralized MetaMask/Web3 Initialization ==================
async function initWeb3() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      account = accounts[0];
      console.log("Connected Account:", account);
    } catch (error) {
      console.error("User denied account access");
      return;
    }
  } else {
    alert("MetaMask not detected. Please install it!");
    return;
  }
}

// ============================================ Load Contracts =================================================

// Load Registration Contract (for user details)
async function loadRegistrationContract() {
  try {
    const response = await fetch("json/registrationABI.json");
    const registrationABI = await response.json();
    // Replace with your deployed Registration Contract address
    const registrationContractAddress =
      "0x686b2F6f4aF473eF13F2BFE25889C096131fDD43";
    registrationContract = new web3.eth.Contract(
      registrationABI,
      registrationContractAddress
    );
    console.log("✅ Registration Contract Loaded:", registrationContract);
  } catch (error) {
    console.error("❌ Error loading Registration Contract ABI:", error);
    alert(
      "Failed to load Registration Contract. Please check your network or ABI file."
    );
  }
}

// Load Medicine Contract (for medicine functionality)
async function loadMedicineContract() {
  try {
    const response = await fetch("json/abi.json");
    contractABI = await response.json();
    // Replace with your deployed Medicine Contract address
    const contractAddress = "0x682de30a4038eDdCE549010E7caa681ea392dF2C";
    addMedicineContract = new web3.eth.Contract(contractABI, contractAddress);
    console.log("✅ Medicine Contract Loaded:", addMedicineContract);
  } catch (error) {
    console.error("❌ Error loading Medicine Contract ABI:", error);
    alert(
      "Failed to load Medicine Contract ABI. Please check your network or ABI file."
    );
  }
}


// Dashboard Cards
window.addEventListener("load", async () => {
  try {
    // Ensure the contract is loaded before calling functions
    await loadMedicineContract();

    // Update total medicine count on dashboard
    const count = await addMedicineContract.methods.getMedicineCount().call();
    const totalMedicinesEl = document.querySelector(".stat-card h4.tot_med");
    const medicines = await addMedicineContract.methods.getAllMedicines().call();
    const exp = document.querySelector(".stat-card h4.tot_expired");
    const stock = document.querySelector(".stat-card h4.tot_stock");
    const soldEl = document.querySelector(".stat-card h4.tot_sold");

    if (totalMedicinesEl) {
      totalMedicinesEl.innerText = count.toString();
    }

    let expiredCount = 0;
    let stockCount = 0;
    medicines.forEach((med) => {
      const state = parseInt(med.state);
      if (state === 3) {
        expiredCount++;
      } else if (state === 1) {
        stockCount++;
      }
    });

    if (exp) exp.innerText = expiredCount.toString();
    if (stock) stock.innerText = stockCount.toString();

    // Fetch the total sold count from the contract's soldCounter variable
    const soldCounter = await addMedicineContract.methods.soldCounter().call();
    if (soldEl) soldEl.innerText = soldCounter.toString();
  } catch (error) {
    console.error("❌ Error fetching medicine data:", error);
  }
});

//================================History=============================================

async function updateManufactureTable(userId) {
  try {
    console.log("Fetching manufacturer history from contract...");

    // Fetch the number of medicines from the contract
    const count = await addMedicineContract.methods.getMedicineCount().call();
    console.log("History count:", count);

    let tableHTML;

    if (count === 0) {
      tableHTML = `<div class="history-content">
          <h2>History</h2>
          <p>No transaction history available.</p>
        </div>`;
    } else {
      let historyData = [];

      // Fetch only relevant transactions where manufacturerId === userId
      for (let i = 0; i < count; i++) {
        const entry = await addMedicineContract.methods.manufacturerHistory(i).call();

        if (entry.manufacturerId === userId) {
          historyData.push(entry);
        }
      }

      console.log("Filtered Manufacturer history:", historyData);
      console.log(historyData.length);
      console.log(userId);

      if (historyData.length === 0) {
        tableHTML = `<div class="history-content">
          <h2>History</h2>
          <p>No transaction history found for this manufacturer.</p>
        </div>`;
      } else {
        tableHTML = `<table class="table table-bordered">
          <thead>
            <tr>
              <th>Medicine ID</th>
              <th>Medicine Name</th>
              <th>Manufacturer ID</th>
              <th>Price (INR)</th>
              <th>Quantity</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>`;

          for (const entry of historyData) {
            const medicineData = await addMedicineContract.methods.getMedicine(entry.medicineId).call();
            const rowColor = Number(medicineData[11]) === 3 ? 'style="color: red; background-color: antiquewhite;"' : '';
          
            tableHTML += `<tr>
              <td ${rowColor}>${entry.medicineId}</td>
              <td ${rowColor}>${entry.medicineName}</td>
              <td ${rowColor}>${entry.manufacturerId}</td>
              <td ${rowColor}>${entry.price}</td>
              <td ${rowColor}>${entry.quantity}</td>
              <td ${rowColor}>${new Date(entry.timestamp * 1000).toLocaleString()}</td>
            </tr>`;
          }
          

        tableHTML += `</tbody></table>`;
      }
    }

    // Update the HTML with the filtered table or message
    document.querySelector('.history-content').innerHTML = tableHTML;
  } catch (error) {
    console.error("🚨 Error updating history table:", error);
    alert("Failed to load history. Check console for details.");
  }
}

async function updateSaleTable(userRole, userId, currentAccount) {
  try {
    console.log("Fetching sale history count...");

    let historyData = [];
    let index = 0;

    // Fetch sale history records using a while loop until no more values exist
    while (true) {
      try {
        const entry = await addMedicineContract.methods.saleHistory(index).call();
        if (!entry || !entry.medicineId) break; // Exit loop if no more records
        historyData.push(entry);
        index++;
      } catch (err) {
        console.log("No more records found or error encountered:", err);
        break;
      }
    }
    console.log("Sale history fetched:", historyData);

    const buyerTypeFilter = (userRole === "wholesaler") ? '1' : '2';

    // Filter the sale history data for the logged-in user
    const userHistory = historyData.filter(entry => 
      entry.buyerType.toString() === buyerTypeFilter && entry.buyerId === userId
    );

    let tableHTML;

    if (userHistory.length === 0) {
      tableHTML = `<div class="history-content">
          <h2>History</h2>
          <p>No transaction history found for this user.</p>
        </div>`;
    } else {
      tableHTML = `<table class="table table-bordered">
        <thead>
          <tr>
            <th>Medicine ID</th>
            <th>Manufacturer ID</th>
            ${userRole === "pharmacy" ? '<th>Seller ID</th>' : ''}
            <th>Quantity</th>
            <th>Price per unit (INR)</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>`;

      for (const entry of userHistory) {
        let manufacturerID = "Unknown"; // Default if fetch fails

        try {
          const medDetails = await addMedicineContract.methods.getMedicine(entry.medicineId).call({ from: currentAccount });
          manufacturerID = medDetails.manufacturerId || medDetails[0]; // Assuming manufacturer ID is the first element
        } catch (err) {
          console.error(`Failed to fetch manufacturer ID for ${entry.medicineId}:`, err);
        }

        tableHTML += `<tr>
          <td>${entry.medicineId}</td>
          <td>${manufacturerID}</td>
          ${userRole === "pharmacy" ? `<td>${entry.sellerId}</td>` : ''}
          <td>${entry.quantity}</td>
          <td>${entry.priceAtSale}</td>
          <td>${new Date(entry.timestamp * 1000).toLocaleString()}</td>
        </tr>`;
      }

      tableHTML += `</tbody></table>`;
    }

    // Update the HTML with the filtered table or message
    document.querySelector('.history-content').innerHTML = tableHTML;
  } catch (error) {
    console.error("🚨 Error updating sale history table:", error);
    alert("Failed to load sale history. Check console for details.");
  }
}



async function updateHistoryTable() {
  try {
    console.log("Fetching history data from contract...");

    // Retrieve current login details from localStorage
    const email = localStorage.getItem('userEmail');
    const password = localStorage.getItem('userPassword');
    const userId = localStorage.getItem(`userId_${email}`);

    const accounts = await web3.eth.getAccounts();
    const currentAccount = accounts[0];
    const userResult = await registrationContract.methods
      .getUserDetails(email, password)
      .call({ from: currentAccount });
    const userRole = userResult[5].toLowerCase();
    // const userRole = localStorage.getItem('userRole')?.toLowerCase();

    let tableHTML = `<div class="history-content">
          <h2>History</h2>
          <p>This area will display history details.</p>
        </div>`;

    if (userRole === "manufacturer") {
      updateManufactureTable(userId);
    } else if (userRole === "wholesaler" || userRole === "pharmacy") {
      updateSaleTable(userRole, userId);
    } else {
      document.querySelector('.history-content').innerHTML = "<p>No history available for your role.</p>";
    }

    // Update the UI with the generated history table
    document.querySelector('.history-content').innerHTML = tableHTML;
  } catch (error) {
    console.error("🚨 Error updating history table:", error);
    alert("Failed to load history. Check console for details.");
  }
}


// History overlay handling
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('history-overlay');
  const closeBtn = document.getElementById('close-history');
  const dashboardCards = document.querySelector('.row.g-4'); // Dashboard card container

  // Close overlay when the close button is clicked
  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    dashboardCards.style.display = 'flex'; // Show the dashboard cards
  });

  // When any element with the class "hit" is clicked, display overlay and update history
  const hitElements = document.querySelectorAll('.hit');
  hitElements.forEach(elem => {
    elem.addEventListener('click', async () => {
      overlay.style.display = 'block';
      dashboardCards.style.display = 'none'; // Hide the dashboard cards
      await updateHistoryTable(); // Populate history content
    });
  });
});





async function fetchUserProfile(userEmail = null) {
  const email = userEmail || localStorage.getItem("userEmail");
  const password = localStorage.getItem("userPassword");

  if (!email || (!userEmail && !password)) {
    console.error("User credentials not found in localStorage.");
    return;
  }

  try {
    if (!account) {
      const accounts = await web3.eth.getAccounts();
      account = accounts[0];
    }

    // Call contract method to get user details
    const result = await registrationContract.methods
      .getUserDetails(email, password)
      .call({ from: account });

    if (!result) {
      console.error("Failed to retrieve user details.");
      return;
    }

    // Extract user details from struct (including the new unique ID)
    const userDetails = {
      uniqueId: result.id,
      fullName: `${result.firstName} ${result.lastName}`,
      email: email,
      phone: result.phone,
      role: result.role,
      address: result.addressDetails
    };

    // Update UI elements
    document.getElementById("fullNameDisplay").textContent = userDetails.fullName;
    document.getElementById("fullName").value = userDetails.fullName;
    document.getElementById("email").value = userDetails.email;
    document.getElementById("phone").value = userDetails.phone;
    document.getElementById("role").value = userDetails.role;

    // Populate Address Fields
    document.getElementById("streetAddress").value = userDetails.address.street;
    document.getElementById("city").value = userDetails.address.city;
    document.getElementById("state").value = userDetails.address.state;
    document.getElementById("zip").value = userDetails.address.zip;

    // Set the unique ID in the UI
    document.getElementById("userId").textContent = `ID: ${userDetails.uniqueId}`;

    return userDetails;
  } catch (error) {
    console.error("Error fetching user details from blockchain:", error);
    alert("Error fetching profile details. Please try again.");
    return null;
  }
}


async function updateAddress(event) {
  event.preventDefault(); // Prevent default form submission

  const email = localStorage.getItem("userEmail");
  const password = localStorage.getItem("userPassword");

  if (!email || !password) {
    Swal.fire({
      icon: 'error',
      title: 'Missing Credentials',
      text: 'User credentials not found. Please log in.'
    });
    return;
  }

  try {
    // Ensure the account is available
    if (!account) {
      const accounts = await web3.eth.getAccounts();
      account = accounts[0];
    }

    // Retrieve new address values from the UI
    const street = document.getElementById("streetAddress").value.trim();
    const city = document.getElementById("city").value.trim();
    const state = document.getElementById("state").value.trim();
    const zip = document.getElementById("zip").value.trim();

    // Create the new address object matching the Solidity struct
    const newAddress = {
      street: street,
      city: city,
      state: state,
      zip: zip
    };

    // Call the updateAddress method on the contract
    await registrationContract.methods
      .updateAddress(email, password, newAddress)
      .send({ from: account });

    Swal.fire({
      icon: 'success',
      title: 'Address Updated',
      text: 'Address updated successfully!'
    });
  } catch (error) {
    console.error("Error updating address:", error);
    Swal.fire({
      icon: 'error',
      title: 'Update Failed',
      text: `Address update failed: ${error.message}`
    });
  }
}


// Attach event listener to the update form (ensure the form selector matches your HTML)
document.querySelector("form").addEventListener("submit", updateAddress);






// =================================SECURITY===========================================

// Function to validate password strength
function validatePassword(password) {
  // Regex explanation:
  // (?=.*[a-z])       --> at least one lowercase letter
  // (?=.*[A-Z])       --> at least one uppercase letter
  // (?=.*\d)          --> at least one digit
  // (?=.*[\W_])       --> at least one special character
  // .{8,}             --> at least 8 characters in total
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}

async function updatePassword(event) {
  event.preventDefault(); // Prevent the form from submitting normally

  // Get new password and confirmation from the form
  const newPassword = document.getElementById('newPassword').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();

  // Validate that both password fields match
  if (newPassword !== confirmPassword) {
    Swal.fire({
      icon: 'error',
      title: 'Password Mismatch',
      text: 'The new password and confirm password fields do not match.'
    });
    return;
  }

  // Validate password strength
  if (!validatePassword(newPassword)) {
    Swal.fire({
      icon: 'error',
      title: 'Weak Password',
      text: 'Password must be at least 8 characters long, include both uppercase and lowercase letters, at least one number, and one special character.'
    });
    return;
  }

  // Retrieve user credentials from localStorage
  const email = localStorage.getItem("userEmail");
  const oldPassword = localStorage.getItem("userPassword"); // Current password
  if (!email || !oldPassword) {
    Swal.fire({
      icon: 'error',
      title: 'Missing Credentials',
      text: 'User credentials not found. Please log in again.'
    });
    return;
  }

  try {
    // Ensure the account is available
    if (!account) {
      const accounts = await web3.eth.getAccounts();
      account = accounts[0];
    }

    // Call the updatePassword method on the contract
    await registrationContract.methods
      .updatePassword(email, oldPassword, newPassword)
      .send({ from: account });

    // Update the stored password in localStorage to the new password
    localStorage.setItem('userPassword', newPassword);

    Swal.fire({
      icon: 'success',
      title: 'Password Updated',
      text: 'Your password has been updated successfully.'
    });
  } catch (error) {
    console.error("Error updating password:", error);
    Swal.fire({
      icon: 'error',
      title: 'Update Failed',
      text: `Password update failed: ${error.message}`
    });
  }
}
// Cancel Button for Track Medicine Section

// Attach event listener to the password form
document.getElementById('passwordForm').addEventListener('submit', updatePassword);


// Function to deactivate the account
async function deactivateAccount(event) {
  event.preventDefault();
  console.log("Deactivate button clicked");

  const email = localStorage.getItem("userEmail");
  const password = localStorage.getItem("userPassword");

  if (!email || !password) {
    Swal.fire({
      icon: 'error',
      title: 'Missing Credentials',
      text: 'User credentials not found. Please log in.'
    });
    return;
  }

  // Confirm user wants to deactivate account
  const confirmResult = await Swal.fire({
    icon: 'warning',
    title: 'Deactivate Account',
    text: 'Are you sure you want to deactivate your account? You will be able to reactivate it after 30 days.',
    showCancelButton: true,
    confirmButtonText: 'Yes, deactivate',
    cancelButtonText: 'Cancel'
  });

  if (!confirmResult.isConfirmed) return;

  try {
    // Ensure the account is available
    if (!account) {
      const accounts = await web3.eth.getAccounts();
      account = accounts[0];
    }

    await registrationContract.methods.deactivateAccount(email, password)
      .send({ from: account });

    Swal.fire({
      icon: 'success',
      title: 'Account Deactivated',
      text: 'Your account has been deactivated. You can reactivate it after 30 days.',
      confirmButtonText: 'OK'
    }).then(() => {
      // Clear credentials and redirect to the authentication page
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userPassword');
      localStorage.removeItem('userWalletAddress');
      window.location.href = 'auth.html';
    });
  } catch (error) {
    console.error("Error deactivating account:", error);
    Swal.fire({
      icon: 'error',
      title: 'Deactivation Failed',
      text: error.message
    });
  }
}

// Function to delete the account
async function deleteAccount(event) {
  event.preventDefault();
  console.log("Delete button clicked");

  // Ask for confirmation before deleting the account
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Confirm Account Deletion',
    text: 'This action cannot be undone. Are you sure you want to delete your account?',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel'
  });

  if (!result.isConfirmed) return; // User canceled deletion

  const email = localStorage.getItem("userEmail");
  const password = localStorage.getItem("userPassword");

  if (!email || !password) {
    Swal.fire({
      icon: 'error',
      title: 'Missing Credentials',
      text: 'User credentials not found. Please log in.'
    });
    return;
  }

  try {
    // Ensure the account is available
    if (!account) {
      const accounts = await web3.eth.getAccounts();
      account = accounts[0];
    }

    await registrationContract.methods.deleteAccount(email, password)
      .send({ from: account });

    Swal.fire({
      icon: 'success',
      title: 'Account Deleted',
      text: 'Your account has been deleted successfully.',
      confirmButtonText: 'OK'
    }).then(() => {
      // Clear all stored credentials and redirect to the authentication page
      localStorage.clear();
      window.location.href = 'auth.html';
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    Swal.fire({
      icon: 'error',
      title: 'Deletion Failed',
      text: error.message
    });
  }
}

// Attach event listeners after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  const deactivateBtn = document.getElementById('deactivateButton');
  const deleteBtn = document.getElementById('deleteButton');
  if (deactivateBtn) {
    deactivateBtn.addEventListener('click', deactivateAccount);
  }
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteAccount);
  }

  const cancelButton = document.getElementById("cancelButton");
  if (cancelButton) {
    cancelButton.addEventListener("click", function (e) {
      e.preventDefault(); // Prevent any default behavior
      const newPassword = document.getElementById("newPassword");
      const confirmPassword = document.getElementById("confirmPassword");

      if (newPassword) newPassword.value = "";
      if (confirmPassword) confirmPassword.value = "";
    });
  }
});








// ================== Manual Wallet Connection (for Changing Wallet) ==================
async function connectWallet() {
  console.log("connectWallet called");
  // Retrieve the manually entered wallet address from the input field
  let manualWallet = document.getElementById("walletAddress").value.trim();

  // Check if the input field is empty
  if (manualWallet === "") {
    alert("Please enter a wallet address.");
    return;
  }

  // Validate the wallet address using web3
  if (!web3.utils.isAddress(manualWallet)) {
    console.log("Address validation failed for:", manualWallet);
    alert("Invalid wallet address. Please enter a correct Ethereum address.");
    return;
  }

  // Update the global account variable with the manually provided address
  account = manualWallet;
  console.log("Manual wallet set as account:", account);

  // Store the new wallet address in localStorage so that it persists until logout
  localStorage.setItem("userWalletAddress", manualWallet);

  // Update verification status in both Security and Profile sections
  updateVerificationStatus(manualWallet);
}

function updateVerificationStatus(walletAddress) {
  if (walletAddress) {
    // Update Security Section
    const securityStatus = document.getElementById(
      "securityVerificationStatus"
    );
    if (securityStatus) {
      securityStatus.innerHTML = `<i class="bi bi-check-circle"></i> Authorized`;
      securityStatus.classList.remove("bg-danger");
      securityStatus.classList.add("bg-success");
    }
    // Update Profile Section (if applicable)
    const profileStatus = document.getElementById("profileVerificationStatus");
    if (profileStatus) {
      profileStatus.innerHTML = `<i class="bi bi-check-circle"></i> Authorized`;
      profileStatus.classList.remove("bg-danger");
      profileStatus.classList.add("bg-success");
    }
  }
}

// Attach the event listener to the "Add Wallet" button
document
  .getElementById("addWalletButton")
  .addEventListener("click", connectWallet);

// Abstraction of sidebar
function updateSidebarButtons(role) {
  // Convert role to lowercase for a case-insensitive check
  var userRole = role.toLowerCase();

  // Select sidebar links using their data-section attributes
  var addMedicineLink = document.querySelector(
    'a[data-section="add-medicine"]'
  );
  var buyMedicineLink = document.querySelector(
    'a[data-section="buy-medicine"]'
  );

  if (!addMedicineLink || !buyMedicineLink) {
    console.error("Sidebar buttons not found. Check element selectors.");
    return;
  }

  if (userRole === "manufacturer") {
    // Manufacturer: show "Add Medicine", hide "Buy Medicine"
    addMedicineLink.style.display = "block";
    buyMedicineLink.style.display = "none";
  } else {
    // For all other roles: hide "Add Medicine", show "Buy Medicine"
    addMedicineLink.style.display = "none";
    buyMedicineLink.style.display = "block";
  }
}

// ================== Initialization on Window Load ==================
window.addEventListener("load", async () => {
  try {
    await initWeb3();
    await loadRegistrationContract();
    await loadMedicineContract();

    // Fetch user profile and store it
    const userProfile = await fetchUserProfile();

    // Automatically update wallet from localStorage if it exists
    const storedWallet = localStorage.getItem("userWalletAddress");
    if (storedWallet) {
      document.getElementById("walletAddress").value = storedWallet;
      account = storedWallet;
      updateVerificationStatus(storedWallet);
    }

    // ✅ Update Sidebar Based on User Role (Fix)
    if (userProfile && userProfile.role) {
      updateSidebarButtons(userProfile.role);
    }
  } catch (error) {
    console.error("Error during initialization:", error);
    alert("Failed to initialize the application. Please refresh and try again.");
  }
});


// ================== DOMContentLoaded Event for UI Interactions ==================
document.addEventListener("DOMContentLoaded", function () {
  // Logout functionality
  const logoutLink = document.getElementById("logout");
  const email = localStorage.getItem("userEmail");
  if (logoutLink) {
    logoutLink.addEventListener("click", function (e) {
      e.preventDefault();
      // Clear session data from localStorage
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userPassword");
      localStorage.removeItem("userWalletAddress");
      localStorage.removeItem(`userId_${email}`);
      // Redirect to logout.html
      window.location.href = "logout.html";
    });
  }

  // Navigation and Sidebar
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".content-section");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      if (link.id === "logout") {
        window.location.replace("logout.html");
        return;
      }
      navLinks.forEach((l) => l.classList.remove("active"));
      sections.forEach((s) => s.classList.remove("active"));
      link.classList.add("active");
      const sectionId = link.getAttribute("data-section");
      if (document.getElementById(sectionId)) {
        document.getElementById(sectionId).classList.add("active");
      }
      if (window.innerWidth <= 768) {
        document.querySelector(".sidebar").classList.remove("show");
      }
    });
  });

  const sidebarToggle = document.getElementById("sidebar-toggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      document.querySelector(".sidebar").classList.toggle("show");
    });
  }

  document.addEventListener("click", (e) => {
    const sidebar = document.querySelector(".sidebar");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    if (
      window.innerWidth <= 768 &&
      sidebar &&
      sidebarToggle &&
      !sidebar.contains(e.target) &&
      !sidebarToggle.contains(e.target)
    ) {
      sidebar.classList.remove("show");
    }
  });

// ================================================== Track Medicine Button Click Handler ==========================================
document.getElementById("track-med").addEventListener("click", async function (e) {
  e.preventDefault();

  // Function to retrieve Medicine ID either from a QR code file or text input
  async function getMedicineId() {
    const qrInput = document.getElementById("qr-code");
    if (qrInput && qrInput.files && qrInput.files.length > 0) {
      const file = qrInput.files[0];
      const dataURL = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
      const img = new Image();
      img.src = dataURL;
      await new Promise((resolve) => { img.onload = resolve; });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);
      if (code && code.data) {
        try {
          // If QR code data is JSON and contains a medicineId property:
          const data = JSON.parse(code.data);
          return data.medicineId;
        } catch (e) {
          // Otherwise, assume the QR code data is the medicineId directly.
          return code.data;
        }
      } else {
        // Fallback to the input field if QR decoding fails.
        return document.getElementById("track-medicine-id").value.trim();
      }
    } else {
      // No QR file uploaded; use the text input.
      return document.getElementById("track-medicine-id").value.trim();
    }
  }

  const medicineId = await getMedicineId();
  if (!medicineId) {
    Swal.fire({
      title: "Missing Medicine ID",
      text: "Please enter a valid Medicine ID.",
      icon: "warning",
      confirmButtonText: "OK",
    });
    return;
  }

  try {
    // Request user's Ethereum accounts
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const currentAccount = accounts[0]; // currentAccount is defined here
    console.log("Current Account:", currentAccount);
    // Fetch medicine details from the blockchain using the smart contract.
    const medicineData = await addMedicineContract.methods.getMedicine(medicineId).call();

    // Check if medicine exists by verifying manufacturerId (index 0)
    if (!medicineData[0] || medicineData[0] === "") {
      Swal.fire({
        title: "Not Found",
        text: "Medicine not found in the blockchain.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    // Create a medicine object for easier reference.
    const medicine = {
      manufacturerId: medicineData[0],
      medicineName: medicineData[1],
      medicineId: medicineData[2],
      medicineType: medicineData[3],
      strength: medicineData[4],
      batchNumber: medicineData[5],
      storageConditions: medicineData[6],
      manufactureDate: medicineData[7] ? new Date(medicineData[7] * 1000).toLocaleDateString() : "N/A",
      expiryDate: medicineData[8] ? new Date(medicineData[8] * 1000).toLocaleDateString() : "N/A",
      price: medicineData[9],
      quantity: medicineData[10],
      state: parseInt(medicineData[11]),
    };

    // Medicine state mapping and icons.
    const medicineStates = ["Manufactured", "InStock", "Sold", "Expired"];
    const medicineIcons = ["🏭", "📦", "🛒", "☠"];

    console.log("Fetched Medicine Data:", medicineData);

    // --- Step 2: Check & Update Expired Medicine State ---
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const isExpired = (medicine.expiryTimestamp < currentTimestamp);
    if (isExpired && medicine.state !== 3) { // 3 represents "Expired"
      console.log(`Medicine ${medicine.medicineName} (${medicine.medicineId}) is expired. Updating state...`);
      try {
        await addMedicineContract.methods
          .updateMedicineState(medicine.medicineId, 3, medicine.manufacturerId)
          .send({ from: currentAccount });
        console.log(`State updated to Expired for ${medicine.medicineId}`);
        // Re-fetch updated medicine details
        medicineData = await addMedicineContract.methods.getMedicine(medicineId).call();
        medicine.state = parseInt(medicineData[11]);
      } catch (updateError) {
        console.error(`Error updating state for ${medicine.medicineId}:`, updateError);
      }
    }

    Swal.close();

    // Display the medicine details in a styled div.
    document.getElementById("medicine-details").innerHTML = `
      <div style="max-width: 600px; margin: 20px auto; padding: 20px; background: white; border-radius: 12px; box-shadow: 0px 4px 12px rgba(0,0,0,0.1);">
        <h2 style="text-align: center; color: #333;">${medicine.medicineName} <span style="color: #777;">(${medicine.medicineId})</span></h2>
        <p style="text-align: center; font-size: 14px; color: #555;">Manufacturer: <strong>${medicine.manufacturerId}</strong></p>
        <hr style="margin: 10px 0;">
        <p><strong>💊 Medicine Type:</strong> ${medicine.medicineType}</p>
        <p><strong>⚡ Strength:</strong> ${medicine.strength}</p>
        <p><strong>🔢 Batch Number:</strong> ${medicine.batchNumber}</p>
        <p><strong>❄ Storage Conditions:</strong> ${medicine.storageConditions}</p>
        <p><strong>📅 Manufacture Date:</strong> ${medicine.manufactureDate}</p>
        <p><strong>⏳ Expiry Date:</strong> ${medicine.expiryDate}</p>
        <p><strong>💰 Price:</strong> ${medicine.price} tokens</p>
        <p><strong>📦 Quantity:</strong> ${medicine.quantity}</p>
        <p><strong>🚀 Current State:</strong> <span style="color: ${medicine.state === 3 ? "red" : "#4CAF50"}; font-weight: bold;">${medicineStates[medicine.state]}</span></p>
        <div class="progress-container" style="display: flex; align-items: center; justify-content: space-between; position: relative; margin-top: 20px;">
          <div class="progress-line" style="position: absolute; top: 50%; left: 8%; width: 84%; height: 6px; background: #ddd; border-radius: 5px; transform: translateY(-50%); z-index: -1;"></div>
          ${medicineStates.map((state, index) => `
            <div class="progress-step" style="
              width: 40px; height: 40px; border-radius: 50%;
              font-size: 18px; font-weight: bold;
              display: flex; justify-content: center; align-items: center;
              background: ${index <= medicine.state ? "#4CAF50" : "#ddd"};
              color: ${index <= medicine.state ? "white" : "black"};
              border: 3px solid ${index <= medicine.state ? "#4CAF50" : "#bbb"};
              box-shadow: ${index === medicine.state ? "0px 0px 10px rgba(0, 255, 0, 0.8)" : "none"};
              transition: all 0.3s ease-in-out;
              position: relative;
            ">
              ${medicineIcons[index]}
              <span style="
                position: absolute; top: 50px; white-space: nowrap;
                font-size: 12px; color: ${index <= medicine.state ? "#4CAF50" : "#777"};
              ">${state}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    // Show a loading indicator while processing (using SweetAlert2)
    Swal.fire({
      title: 'Fetching Medicine Details...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });
    setTimeout(() => {
      Swal.close();
      document.getElementById("result-div").style.display = "block";
    }, 1000);

  } catch (error) {
    console.error("❌ Error fetching medicine:", error);
    Swal.fire({
      title: "Error!",
      text: "Medicine not found or error occurred.",
      icon: "error",
      confirmButtonText: "OK"
    });
  }
});

// --- Cancel Button Handler for Track Medicine Section ---
document.getElementById("cancel-button").addEventListener("click", function (e) {
  e.preventDefault();
  document.getElementById("result-div").style.display = "none";
  // Clear the QR file input (if any)
  const qrInput = document.getElementById("qr-code");
  if (qrInput) { qrInput.value = ""; }
  // Clear the text input for Medicine ID
  document.getElementById("track-medicine-id").value = "";
});

});


// =============================================================== ADD MEDICINE  ==================================================
window.addEventListener("load", async () => {
  // ✅ Check for MetaMask and request account access
  if (window.ethereum) {
    window.web3 = new Web3(window.ethereum);
    try {
      await ethereum.request({ method: "eth_requestAccounts" });
    } catch (error) {
      console.error("❌ User denied account access");
      Swal.fire({
        title: 'Error!',
        text: 'User denied account access',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }
  } else {
    Swal.fire({
      title: 'MetaMask Not Detected!',
      text: 'Please install MetaMask!',
      icon: 'warning',
      confirmButtonText: 'OK'
    });
    return;
  }

  // ✅ Get Current Account
  const accounts = await web3.eth.getAccounts();

  // ✅ Contract Address and ABI Loading
  const contractAddress = "0x682de30a4038eDdCE549010E7caa681ea392dF2C";
  let contractABI;
  try {
    const response = await fetch("json/abi.json");
    contractABI = await response.json();
    console.log("✅ ABI Loaded Successfully:", contractABI);
  } catch (error) {
    console.error("❌ Error loading ABI:", error);
    Swal.fire({
      title: 'Error!',
      text: 'Failed to load contract ABI. Please check your network or ABI file.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }

  // ✅ Initialize Contract Instance
  addMedicineContract = new web3.eth.Contract(contractABI, contractAddress);
  console.log("Contract Loaded:", addMedicineContract);

  // ✅ Auto-Fill Manufacturer ID from Profile
  const loggedInEmail = localStorage.getItem("userEmail");
  let manufacturerId = localStorage.getItem(`userId_${loggedInEmail}`);
  if (!manufacturerId) {
    console.error("❌ Manufacturer ID not found for the logged-in user.");
    Swal.fire({
      title: 'Error!',
      text: 'Unable to retrieve your Manufacturer ID. Please log in again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }
  console.log("✅ Manufacturer ID Fetched:", manufacturerId);
  document.getElementById("manufacturerId").value = manufacturerId;

  // Event Listener: Medicine Added Event.
  addMedicineContract.events.MedicineAdded({ fromBlock: "latest" })
    .on("data", function (event) {
      console.log("✅ Medicine Added Event Detected!", event);
      console.log("Medicine ID:", event.returnValues.medicineId);
      console.log("Medicine Name:", event.returnValues.medicineName);
      console.log("Timestamp:", new Date(event.returnValues.timestamp * 1000).toLocaleString());
    })
    .on("error", function (error) {
      console.error("❌ Error in event listener:", error);
    });

  // --- QR Code Generation & Download Function ---
  function generateAndDownloadQRCode(medicineDetails) {
    const tempContainer = document.createElement("div");
    new QRCode(tempContainer, {
      text: JSON.stringify({ medicineId: medicineDetails.medicineId }),
      width: 256,
      height: 256,
      correctLevel: QRCode.CorrectLevel.H,
    });
    setTimeout(() => {
      let qrDataURL;
      const canvas = tempContainer.querySelector("canvas");
      if (canvas) {
        qrDataURL = canvas.toDataURL("image/png");
      } else {
        const img = tempContainer.querySelector("img");
        if (img) {
          qrDataURL = img.src;
        }
      }
      if (qrDataURL) {
        const link = document.createElement("a");
        link.href = qrDataURL;
        link.download = medicineDetails.medicineId + ".png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error("QR code generation failed.");
      }
    }, 500);
  }

  // Handle Add Medicine Form Submission.
  const addMedicineForm = document.querySelector("#add-medicine form");
  if (addMedicineForm) {
    addMedicineForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      try {
        // Auto-assign Manufacturer ID.
        document.getElementById("manufacturerId").value = manufacturerId;
        // Retrieve form input values.
        const medicineName = document.getElementById("medicineName").value;
        const medicineId = document.getElementById("medicineId").value;
        const medicineType = document.getElementById("medicineType").value;
        const strength = document.getElementById("strength").value;
        const batchNumber = document.getElementById("batchNumber").value;
        const storageConditions = document.getElementById("storageConditions").value;
        const manufactureDateStr = document.getElementById("manufactureDate").value;
        const expiryDateStr = document.getElementById("expiryDate").value;
        const price = document.getElementById("price").value;
        const quantity = document.getElementById("quantity").value;

        // Validate required fields.
        if (!medicineName || !medicineId || !medicineType || !strength || !batchNumber ||
          !storageConditions || !price || !quantity) {
          Swal.fire({
            title: 'Missing Fields',
            text: 'Please fill in all required fields.',
            icon: 'warning',
            confirmButtonText: 'OK'
          });
          return;
        }

        // Validate Dates.
        if (!manufactureDateStr || !expiryDateStr) {
          Swal.fire({
            title: 'Invalid Dates',
            text: 'Please enter valid manufacture and expiry dates.',
            icon: 'warning',
            confirmButtonText: 'OK'
          });
          return;
        }
        const manufactureDate = Math.floor(new Date(manufactureDateStr).getTime() / 1000);
        const expiryDate = Math.floor(new Date(expiryDateStr).getTime() / 1000);
        if (manufactureDate >= expiryDate) {
          Swal.fire({
            title: 'Date Error',
            text: 'Manufacture date must be before expiry date.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
          return;
        }

        console.log("🔵 Submitting Medicine:", {
          manufacturerId,
          medicineName,
          medicineId,
          medicineType,
          strength,
          batchNumber,
          storageConditions,
          manufactureDate,
          expiryDate,
          price,
          quantity,
        });

        // Build the MedicineInput object.
        const medicineInput = {
          manufacturerId: manufacturerId,
          medicineName: medicineName,
          medicineId: medicineId,
          medicineType: medicineType,
          strength: strength,
          batchNumber: batchNumber,
          storageConditions: storageConditions,
          manufactureDate: manufactureDate,
          expiryDate: expiryDate,
          price: price,         // Base price (before tax)
          quantity: quantity
        };

        // Send the transaction to addMedicine.
        const receipt = await addMedicineContract.methods
          .addMedicine(medicineInput)
          .send({ from: accounts[0] });
        console.log("✅ Transaction Receipt:", receipt);
        Swal.fire({
          title: 'Success!',
          text: 'Medicine added successfully!',
          icon: 'success',
          confirmButtonText: 'OK'
        });

        // Generate and download the QR Code with medicine details.
        const medicineDetails = { manufacturerId, medicineName, medicineId };
        generateAndDownloadQRCode(medicineDetails);

        addMedicineForm.reset();
      } catch (error) {
        console.error("❌ Error adding medicine:", error);
        Swal.fire({
          title: 'Error!',
          text: 'Error adding medicine: ' + error.message,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  }
});


//===============================================================BUY===============================================================

document.addEventListener("DOMContentLoaded", async () => {
  // ================== MetaMask / Web3 Initialization ==================
  if (window.ethereum) {
    window.web3 = new Web3(window.ethereum);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
    } catch (error) {
      Swal.fire({
        title: "Error!",
        text: "User denied account access",
        icon: "error",
        confirmButtonText: "OK"
      });
      return;
    }
  } else {
    Swal.fire({
      title: "MetaMask Missing",
      text: "MetaMask is not installed!",
      icon: "warning",
      confirmButtonText: "OK"
    });
    return;
  }
  const accounts = await web3.eth.getAccounts();
  const currentAccount = accounts[0];

  // ================== Contract Setup ==================
  const contractAddress = "0x682de30a4038eDdCE549010E7caa681ea392dF2C";
  let contractABI;
  try {
    const response = await fetch("json/abi.json");
    contractABI = await response.json();
    console.log("✅ ABI Loaded Successfully:", contractABI);
  } catch (error) {
    console.error("Error loading ABI:", error);
    Swal.fire({
      title: "Error!",
      text: "Failed to load contract ABI. Please check your network or ABI file.",
      icon: "error",
      confirmButtonText: "OK"
    });
    return;
  }
  const addMedicineContract = new web3.eth.Contract(contractABI, contractAddress);
  console.log("Contract Loaded:", addMedicineContract);

  // ================== Auto-Fill Manufacturer ID ==================
  const loggedInEmail = localStorage.getItem("userEmail");
  const manufacturerId = localStorage.getItem(`userId_${loggedInEmail}`);
  if (!manufacturerId) {
    Swal.fire({
      title: "Error!",
      text: "Unable to retrieve your Manufacturer ID. Please log in again.",
      icon: "error",
      confirmButtonText: "OK"
    });
    return;
  }
  console.log("✅ Manufacturer ID Fetched:", manufacturerId);
  document.getElementById("manufacturerId").value = manufacturerId;

  // ================== Event Listener: Medicine Added ==================
  addMedicineContract.events.MedicineAdded({ fromBlock: "latest" })
    .on("data", function (event) {
      console.log("✅ Medicine Added Event Detected!", event);
      console.log("Medicine ID:", event.returnValues.medicineId);
      console.log("Medicine Name:", event.returnValues.medicineName);
      console.log("Timestamp:", new Date(event.returnValues.timestamp * 1000).toLocaleString());
    })
    .on("error", function (error) {
      console.error("❌ Error in event listener:", error);
    });

  // ================== Fetch & Populate Buy Medicines ==================
  const buyMedicineCardsContainer = document.getElementById("medicine-cards");
  const paymentDetails = document.getElementById("payment-details");
  let selectedBuyMedicine = null;

  async function fetchBuyMedicines() {
    try {
      const email = localStorage.getItem("userEmail");
      const password = localStorage.getItem("userPassword");
      if (!email || !password) {
        Swal.fire({
          title: "Error!",
          text: "User credentials not found.",
          icon: "error",
          confirmButtonText: "OK"
        });
        return;
      }
      const userResult = await registrationContract.methods
        .getUserDetails(email, password)
        .call({ from: currentAccount });
      const currentRole = userResult[5];
      console.log("Current User Role:", currentRole);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const medicinesData = await addMedicineContract.methods
        .getAllMedicines()
        .call({ from: currentAccount });

      // Map each medicine with proper field names
      const medicines = await Promise.all(
        medicinesData.map(async (med) => {
          const expiryTs = Number(med[8]);
          const isExpired = expiryTs < currentTimestamp;
          const medicine = {
            manufacturerId: med[0],
            medicineName: med[1],
            medicineId: med[2],
            medicineType: med[3],
            strength: med[4],
            batchNumber: med[5],
            storageConditions: med[6],
            manufactureDate: new Date(Number(med[7]) * 1000).toLocaleDateString(),
            expiryDate: new Date(expiryTs * 1000).toLocaleDateString(),
            price: med[9],
            quantity: med[10],
            state: parseInt(med[11]),
            isExpired: isExpired,
          };

          // Automatically update state to Expired if needed
          if (isExpired && medicine.state !== 3) {
            console.log(`Updating expired medicine: ${medicine.medicineName} (ID: ${medicine.medicineId})`);
            try {
              await addMedicineContract.methods
                .updateMedicineState(medicine.medicineId, 3, medicine.manufacturerId)
                .send({ from: currentAccount });
              console.log(`✅ State updated to Expired for: ${medicine.medicineId}`);
            } catch (updateError) {
              console.error(`❌ Error updating state for ${medicine.medicineId}:`, updateError);
            }
          }
          return medicine;
        })
      );

      // Filter medicines based on role (example logic)
      const filteredMedicines = medicines.filter((medicine) => {
        if (currentRole === "Wholesaler") {
          return medicine.state === 0 || medicine.isExpired;
        } else if (currentRole === "Pharmacy") {
          return medicine.state === 1 && !medicine.isExpired;
        }
        return false;
      });

      populateBuyMedicineCards(filteredMedicines);
    } catch (error) {
      console.error("Error fetching buy medicines from contract:", error);
      buyMedicineCardsContainer.innerHTML =
        "<p class='text-center text-danger'>Failed to load medicines.</p>";
    }
  }

  function populateBuyMedicineCards(medicines) {
    buyMedicineCardsContainer.innerHTML = "";
    if (medicines.length === 0) {
      buyMedicineCardsContainer.innerHTML =
        "<p class='text-center'>No medicines available.</p>";
      return;
    }
    medicines.forEach((medicine) => {
      const card = document.createElement("div");
      card.className = "col";
      card.innerHTML = `
        <div class="card h-100 shadow-sm card-hover">
          <div class="card-body">
            <h5 class="card-title">${medicine.medicineName}</h5>
            <p class="card-text">ID: ${medicine.medicineId}</p>
            <p class="card-text">Price: ${medicine.price} INR</p>
            <p class="card-text">Expiry Date: ${medicine.expiryDate}</p>
            ${medicine.isExpired
          ? '<button class="btn btn-danger w-100 text-white fw-bold" disabled>Expired</button>'
          : `<button class="btn btn-primary w-100" onclick='buyShowDetails(${JSON.stringify(medicine)})'>Buy Now</button>`
        }
          </div>
        </div>
      `;
      buyMedicineCardsContainer.appendChild(card);
    });
  }

  window.buyShowDetails = async (medicine) => {
    try {
      buyMedicineCardsContainer.style.display = "none";
      const medData = await addMedicineContract.methods
        .getMedicine(medicine.medicineId)
        .call({ from: currentAccount });
      // Remap fields using correct indices:
      selectedBuyMedicine = {
        manufacturerId: medData[0],
        medicineName: medData[1],
        medicineId: medicine.medicineId, // fallback from parameter
        medicineType: medData[3],
        strength: medData[4],
        batchNumber: medData[5],
        storageConditions: medData[6],
        manufactureDate: new Date(Number(medData[7]) * 1000).toLocaleDateString(),
        expiryDate: new Date(Number(medData[8]) * 1000).toLocaleDateString(),
        price: medData[9],  // converting from Wei to Ether for display
        quantity: medData[10],
        state: parseInt(medData[11])
      };

      console.log("Fetched Buy Medicine Data:", selectedBuyMedicine);

      // Check if the medicine has expired.
      const expiryTimestamp = Number(medData[8]);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (expiryTimestamp < currentTimestamp) {
        try {
          await addMedicineContract.methods
            .updateMedicineState(selectedBuyMedicine.medicineId, 3, selectedBuyMedicine.manufacturerId)
            .send({ from: currentAccount });
          Swal.fire({
            title: "Expired!",
            text: "This medicine has expired. Its state has been updated to Expired.",
            icon: "warning",
            confirmButtonText: "OK"
          });
        } catch (updateError) {
          console.error("Error updating expired medicine state:", updateError);
        }
        paymentDetails.classList.add("d-none");
        buyMedicineCardsContainer.style.display = "flex";
        fetchBuyMedicines();
        return;
      }

      // ----------------- Fetch Manufacturer Details -----------------
      // Get all user details from the registration contract.
      let manufacturerUser = null;
      try {
        const allUsers = await registrationContract.methods
          .getAllUserDetails()
          .call({ from: currentAccount });
        // Loop through and find the user with matching id.
        for (let i = 0; i < allUsers.length; i++) {
          if (allUsers[i].id === selectedBuyMedicine.manufacturerId) {
            manufacturerUser = allUsers[i];
            break;
          }
        }
      } catch (userError) {
        console.error("Error fetching user details:", userError);
      }

      // ----------------- Populate Payment Details -----------------
      const container = paymentDetails;
      container.querySelector("#manufacturer-id").textContent = selectedBuyMedicine.manufacturerId;
      if (manufacturerUser) {
        container.querySelector("#manufacturer-name").textContent = manufacturerUser.firstName + " " + manufacturerUser.lastName;
        container.querySelector("#manufacturer-contact").textContent = manufacturerUser.phone;
      } else {
        container.querySelector("#manufacturer-name").textContent = "N/A";
        container.querySelector("#manufacturer-contact").textContent = "N/A";
      }
      container.querySelector("#medicine-name").textContent = selectedBuyMedicine.medicineName;
      container.querySelector("#medicine-id").textContent = selectedBuyMedicine.medicineId;
      container.querySelector("#batch-number").textContent = selectedBuyMedicine.batchNumber;
      container.querySelector("#storage-conditions").textContent = selectedBuyMedicine.storageConditions;
      container.querySelector("#currency").textContent = "INR";
      container.querySelector("#price").textContent = selectedBuyMedicine.price;
      container.querySelector("#quantity").textContent = selectedBuyMedicine.quantity;
      container.querySelector("#manufacture-date").textContent = selectedBuyMedicine.manufactureDate;
      container.querySelector("#expiry-date").textContent = selectedBuyMedicine.expiryDate;
      paymentDetails.classList.remove("d-none");
    } catch (error) {
      console.error("Error fetching buy medicine details:", error);
      Swal.fire({
        title: "Error!",
        text: "Medicine not found or an error occurred.",
        icon: "error",
        confirmButtonText: "OK"
      });
    }
  };


  // ================== Confirm Purchase Handler ==================
  document.getElementById("confirm-payment").addEventListener("click", async () => {
    if (!selectedBuyMedicine) {
      Swal.fire({
        title: "Error!",
        text: "No medicine selected!",
        icon: "error",
        confirmButtonText: "OK"
      });
      return;
    }
    try {
      // Use the medicine's available quantity as the purchase quantity.
      const purchaseQuantity = parseInt(selectedBuyMedicine.quantity);
      if (isNaN(purchaseQuantity) || purchaseQuantity <= 0) {
        Swal.fire({
          title: "Invalid Quantity",
          text: "The available quantity is invalid.",
          icon: "warning",
          confirmButtonText: "OK"
        });
        return;
      }

      // Fetch user details from registration contract to get role.
      const email = localStorage.getItem("userEmail");
      const password = localStorage.getItem("userPassword");
      if (!email || !password) {
        Swal.fire({
          title: "Error!",
          text: "User credentials not found.",
          icon: "error",
          confirmButtonText: "OK"
        });
        return;
      }

      const userResult = await registrationContract.methods
        .getUserDetails(email, password)
        .call({ from: currentAccount });
      const currentRole = userResult[5];
      console.log("User Role:", currentRole);

      // Retrieve buyerId using the key with email.
      let buyerId = "";
      if (currentRole === "Wholesaler") {
        buyerId = localStorage.getItem(`userId_${email}`) || "WHOLE001";
      } else if (currentRole === "Pharmacy") {
        buyerId = localStorage.getItem(`userId_${email}`) || "PHARM001";
      } else {
        Swal.fire({
          title: "Not Authorized",
          text: "Your role is not authorized for this action!",
          icon: "error",
          confirmButtonText: "OK"
        });
        return;
      }

      // Calculate total value using BN arithmetic.
      // Convert the displayed price (assumed in Ether as a string) back to Wei.
      // Calculate total value using BN arithmetic.
      const unitPriceBN = web3.utils.toBN(selectedBuyMedicine.price);
      const quantityBN = web3.utils.toBN(selectedBuyMedicine.quantity);
      const totalValue = unitPriceBN.mul(quantityBN);

      // Set buyerType based on role.
      let buyerType;
      if (currentRole === "Wholesaler") {
        buyerType = 1;
      } else if (currentRole === "Pharmacy") {
        buyerType = 2;
      }

      await addMedicineContract.methods
        .purchaseMedicine(selectedBuyMedicine.medicineId, purchaseQuantity, buyerType, buyerId)
        .send({ from: currentAccount, value: totalValue.toString() });

      Swal.fire({
        title: "Purchase Successful!",
        text: "Your purchase was successful.",
        icon: "success",
        confirmButtonText: "OK"
      });

      // After successful purchase, hide payment details and refresh the UI.
      paymentDetails.classList.add("d-none");
      buyMedicineCardsContainer.style.display = "flex";
      fetchBuyMedicines();
    } catch (error) {
      console.error("Error during purchase:", error);
      Swal.fire({
        title: "Error!",
        text: "Purchase failed!",
        icon: "error",
        confirmButtonText: "OK"
      });
    }
  });

  document.getElementById("cancel-payment").addEventListener("click", () => {
    paymentDetails.classList.add("d-none");
    buyMedicineCardsContainer.style.display = "flex";
  });

  // Initial fetch call for Buy Medicine Section.
  fetchBuyMedicines();

});
