document.addEventListener("DOMContentLoaded", function () {
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
    sidebarToggle.addEventListener("click", () => {
        document.querySelector(".sidebar").classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
        const sidebar = document.querySelector(".sidebar");
        const sidebarToggle = document.getElementById("sidebar-toggle");

        if (
            window.innerWidth <= 768 &&
            !sidebar.contains(e.target) &&
            !sidebarToggle.contains(e.target)
        ) {
            sidebar.classList.remove("show");
        }
    });
});

document.getElementById("track-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const medicineId = document.getElementById("medicine-id").value.trim();
    const qrCodeInput = document.getElementById("qr-code").files[0];

    if ((medicineId && qrCodeInput) || (!medicineId && !qrCodeInput)) {
        alert("Please provide either a Medicine ID or upload a QR code, but not both.");
        return;
    }

    if (medicineId) {
        await trackById(medicineId);
    } else if (qrCodeInput) {
        const qrCodeText = await readQrCode(qrCodeInput);
        if (qrCodeText) {
            await trackById(qrCodeText);
        } else {
            document.getElementById("medicine-details").innerHTML = '<p class="text-danger">Medicine not found.</p>';
        }
    }
});

async function readQrCode(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const imageDataUrl = event.target.result;
            const image = new Image();
            image.src = imageDataUrl;

            image.onload = async () => {
                try {
                    const qrCodeText = await decodeQrCode(image);
                    resolve(qrCodeText);
                } catch (error) {
                    console.error("Error decoding QR code:", error);
                    reject(error);
                }
            };
        };

        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            reject(error);
        };

        reader.readAsDataURL(file);
    });
}

async function decodeQrCode(image) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0, image.width, image.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height);

    if (code) {
        return code.data;
    } else {
        throw new Error("No QR code found.");
    }
}

async function trackById(medicineId) {
    let fetchedMedicine = null;

    try {
        const response = await fetch('json/medicine.json');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const medicines = await response.json();
        fetchedMedicine = medicines.find(med => med.medicineId === medicineId);
    } catch (error) {
        console.error('Error fetching the medicine data:', error);
        alert("Error fetching medicine data.");
        return;
    }

    if (fetchedMedicine) {
        displayMedicineDetails(fetchedMedicine);
        populateSupplyChainTable(fetchedMedicine);
        document.getElementById("result-div").style.display = 'block';
        document.getElementById("supply-chain-table").style.display = 'block';
    } else {
        document.getElementById("medicine-details").innerHTML = '<p class="text-danger">Medicine not found.</p>';
        document.getElementById("supply-chain-table").style.display = 'none';
        document.getElementById("result-div").style.display = 'block';
    }
}

function displayMedicineDetails(medicine) {
    const detailsHtml = `
        <h4>${medicine.medicineName} (${medicine.medicineId})</h4>
        <p><strong>Manufacture Date:</strong> ${medicine.manufactureDate}</p>
        <p><strong>Expiry Date:</strong> ${medicine.expiryDate}</p>
    `;
    document.getElementById("medicine-details").innerHTML = detailsHtml;
}

function populateSupplyChainTable(medicine) {
    const table = document.getElementById("supply-chain-table");
    table.style.display = 'block';

    document.querySelector(".manufacturer-buy-id").textContent = medicine.manufacturer.manufacturerId;
    document.querySelector(".manufacturer-sold-id").textContent = medicine.wholesaler.wholesalerId;
    document.querySelector(".manufacturer-sold-date").textContent = medicine.manufacturer.manufactureSoldDate;
    document.querySelector(".manufacturer-price").textContent = medicine.manufacturer.manufacturerPrice;

    document.querySelector(".wholesaler-buy-id").textContent = medicine.wholesaler.wholesalerId;
    document.querySelector(".wholesaler-sold-id").textContent = medicine.distributor.distributorId;
    document.querySelector(".wholesaler-sold-date").textContent = medicine.wholesaler.wholesalerSoldDate;
    document.querySelector(".wholesaler-price").textContent = medicine.wholesaler.wholesalerPrice;

    document.querySelector(".distributor-buy-id").textContent = medicine.distributor.distributorId;
    document.querySelector(".distributor-sold-id").textContent = medicine.pharmacy.pharmacyId;
    document.querySelector(".distributor-sold-date").textContent = medicine.distributor.distributorSoldDate;
    document.querySelector(".distributor-price").textContent = medicine.distributor.distributorPrice;

    document.querySelector(".pharmacy-buy-id").textContent = medicine.pharmacy.pharmacyId;
    document.querySelector(".pharmacy-sold-id").textContent = medicine.consumer.consumerId;
    document.querySelector(".pharmacy-sold-date").textContent = medicine.pharmacy.pharmacySoldDate;
    document.querySelector(".pharmacy-price").textContent = medicine.pharmacy.pharmacyPrice;

    document.querySelector(".consumer-buy-id").textContent = medicine.consumer.consumerId;
}

document.getElementById("cancel-button").addEventListener("click", function () {
    document.getElementById("track-form").reset();
    document.getElementById("result-div").style.display = "none";
});

document.addEventListener("DOMContentLoaded", async function () {
    const medicineCardsContainer = document.getElementById("medicine-cards");

    try {
        const response = await fetch('json/buy-medicine.json');
        if (!response.ok) throw new Error('Failed to fetch medicine data');
        const medicines = await response.json();

        medicines.forEach(medicine => {
            const cardHtml = `
                <div class="col-md-4 mb-4">
                    <div class="stat-card p-3 border">
                        <h3 class="fs-5 mb-2 fw-bold">${medicine.medicineInformation.medicineName}</h3>
                        <p>${medicine.medicineInformation.description}</p>
                        <p>Price: $${medicine.pricing.price.toFixed(2)}</p>
                        <p>Expiry Date: ${medicine.dates.expiryDate}</p>
                        <p>Seller ID: ${medicine.manufacturerDetails.manufacturerId}</p>
                        <button class="btn btn-primary w-100 buy-button" data-medicine='${JSON.stringify(medicine)}'>Buy</button>
                    </div>
                </div>`;
            medicineCardsContainer.insertAdjacentHTML('beforeend', cardHtml);
        });

        const buyButtons = document.querySelectorAll(".buy-button");
        buyButtons.forEach(button => {
            button.addEventListener("click", function () {
                const selectedMedicine = JSON.parse(button.getAttribute('data-medicine'));
                displayPaymentDetails(selectedMedicine);
            });
        });

    } catch (error) {
        console.error(error);
        medicineCardsContainer.innerHTML = '<p class="text-danger">Error loading medicine data.</p>';
    }
});

function displayPaymentDetails(medicine) {
    document.getElementById("medicine-cards").style.display = "none";
    document.getElementById("payment-details").classList.remove("d-none");

    document.getElementById("medicine-name").textContent = medicine.medicineInformation.medicineName;
    document.getElementById("medicine-id").textContent = medicine.medicineInformation.medicineId;
    document.getElementById("medicine-type").textContent = medicine.medicineInformation.medicineType;
    document.getElementById("medicine-strength").textContent = medicine.medicineInformation.strength;
    document.getElementById("medicine-description").textContent = medicine.medicineInformation.description;
    document.getElementById("medicine-composition").textContent = medicine.medicineInformation.composition;

    document.getElementById("manufacturer-id").textContent = medicine.manufacturerDetails.manufacturerId;
    document.getElementById("manufacturer-name").textContent = medicine.manufacturerDetails.manufacturerName;
    document.getElementById("manufacturer-contact").textContent = medicine.manufacturerDetails.contactInformation;

    document.getElementById("batch-number").textContent = medicine.regulatoryInformation.batchNumber;
    document.getElementById("drug-approval-number").textContent = medicine.regulatoryInformation.drugApprovalNumber;

    document.getElementById("storage-conditions").textContent = medicine.packagingAndLabeling.storageConditions;
    document.getElementById("barcode-qr-code").textContent = medicine.packagingAndLabeling.barcodesQrCodes;

    document.getElementById("price").textContent = `$${medicine.pricing.price.toFixed(2)}`;
    document.getElementById("currency").textContent = medicine.pricing.currency;

    document.getElementById("manufacture-date").textContent = medicine.dates.manufactureDate;
    document.getElementById("expiry-date").textContent = medicine.dates.expiryDate;

    document.getElementById("cancel-payment").addEventListener("click", function () {
        document.getElementById("payment-details").classList.add("d-none");
        document.getElementById("medicine-cards").style.display = "flex";
    });

    document.getElementById("confirm-payment").addEventListener("click", function () {
        const quantity = document.getElementById("quantity").value;
        document.getElementById("success-overlay").style.display = "flex";
    });
}

document.getElementById("close-overlay").addEventListener("click", function () {
    document.getElementById("success-overlay").style.display = "none";
    document.getElementById("payment-details").classList.add("d-none");
    document.getElementById("medicine-cards").style.display = "flex";
});

document.getElementById('toggleNewPassword').addEventListener('click', function() {
    const passwordInput = document.getElementById('newPassword');
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;

    const icon = this.querySelector('i');
    icon.classList.toggle('bi-eye');
    icon.classList.toggle('bi-eye-slash');
});

document.getElementById('toggleConfirmPassword').addEventListener('click', function() {
    const passwordInput = document.getElementById('confirmPassword');
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;

    const icon = this.querySelector('i');
    icon.classList.toggle('bi-eye');
    icon.classList.toggle('bi-eye-slash');
});

document.getElementById('passwordForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword === confirmPassword) {
        alert('Password updated successfully!');
    } else {
        alert('Passwords do not match!');
    }
});

document.getElementById('cancelButton').addEventListener('click', function() {
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
});
