// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AddNewMedicine {
    // Enum for Medicine Type
    enum MedicineType { Tablet, Capsule, Syrup, Injection }
    // Enum for Currency Type
    enum CurrencyType { USD, INR, EUR }

    // Structure to store medicine details
    struct Medicine {
        // Manufacturer Details
        uint manufacturerId;
        // Medicine Information
        string medicineName;
        uint medicineId;
        MedicineType medicineType;
        uint strength;
        // Regulatory Information
        uint batchNumber;
        // Packaging and Labeling
        string storageConditions;
        // Pricing
        CurrencyType currency;
        uint price;
        // Dates (represented as Unix timestamps)
        uint manufactureDate;
        uint expiryDate;
        // Address of the account that added the medicine
        address addedBy;
    }

    // Mapping from Medicine ID to its details
    mapping(uint => Medicine) public medicines;

    // Event emitted when a new medicine is added
    event MedicineAdded(
        uint medicineId,
        string medicineName,
        address indexed addedBy,
        uint timestamp
    );

    // Function to add a new medicine record
    function addMedicine(
        uint _manufacturerId,
        string memory _medicineName,
        uint _medicineId,
        MedicineType _medicineType,
        uint _strength,
        uint _batchNumber,
        string memory _storageConditions,
        CurrencyType _currency,
        uint _price,
        uint _manufactureDate,
        uint _expiryDate
    ) public {
        // Ensure that the medicine ID is not zero
        require(_medicineId != 0, "Medicine ID cannot be zero");
        // Ensure that a medicine with the same ID does not already exist
        require(medicines[_medicineId].addedBy == address(0), "Medicine already exists");

        // Create a new Medicine struct and store it in the mapping
        medicines[_medicineId] = Medicine({
            manufacturerId: _manufacturerId,
            medicineName: _medicineName,
            medicineId: _medicineId,
            medicineType: _medicineType,
            strength: _strength,
            batchNumber: _batchNumber,
            storageConditions: _storageConditions,
            currency: _currency,
            price: _price,
            manufactureDate: _manufactureDate,
            expiryDate: _expiryDate,
            addedBy: msg.sender
        });

        // Emit an event for the new medicine addition
        emit MedicineAdded(_medicineId, _medicineName, msg.sender, block.timestamp);
    }
}
