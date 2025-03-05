// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AddNewMedicine {
    // Structure to store medicine details
    struct Medicine {
        // Manufacturer Details
        string manufacturerId;
        // Medicine Information
        string medicineName;
        string medicineId;
        string medicineType;
        string strength;
        // Regulatory Information
        string batchNumber;
        // Packaging and Labeling
        string storageConditions;
        // Pricing
        string currency;
        uint256 price;
        // Dates (represented as Unix timestamps)
        uint256 manufactureDate;
        uint256 expiryDate;
        // Address of the account that added the medicine
        address addedBy;
    }

    // Mapping from Medicine ID to its details
    mapping(string => Medicine) public medicines;

    // Event emitted when a new medicine is added
    event MedicineAdded(
        string medicineId,
        string medicineName,
        address indexed addedBy,
        uint256 timestamp
    );

    // Function to add a new medicine record
    function addMedicine(
        string memory _manufacturerId,
        string memory _medicineName,
        string memory _medicineId,
        string memory _medicineType,
        string memory _strength,
        string memory _batchNumber,
        string memory _storageConditions,
        string memory _currency,
        uint256 _price,
        uint256 _manufactureDate,
        uint256 _expiryDate
    ) public {
        // Ensure that a medicine with the same ID does not already exist
        require(bytes(medicines[_medicineId].medicineId).length == 0, "Medicine already exists");

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