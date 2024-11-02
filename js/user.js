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

    const medicineId = document.getElementById("medicine-id").value;
    const qrCodeInput = document.getElementById("qr-code").files[0];

    if (!medicineId && !qrCodeInput) {
        alert("Please provide either a Medicine ID or upload a QR code.");
        return;
    }

    let fetchedMedicine = null;

    if (medicineId) {
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
        }
    } else if (qrCodeInput) {
        alert("QR code handling not implemented yet.");
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
});

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
