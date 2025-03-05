// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AddMedicine {
    // Valid options for selectable fields
    string[] private validMedicineTypes = ["tablet", "capsule", "syrup", "injection"];
    string[] private validCurrencies = ["USD", "INR", "EUR"];

    // Structure to hold medicine details
    struct Medicine {
        // Manufacturer Details
        uint manufacturerID;
        
        // Medicine Information
        string medicineName;
        uint medicineID;
        string medicineType; // Must be one of validMedicineTypes
        uint strength;
        
        // Regulatory Information
        uint batchNumber;
        
        // Packaging and Labeling
        string storageConditions;
        
        // Pricing
        string currency; // Must be one of validCurrencies
        uint price;
        
        // Dates
        string manufactureDate;
        string expiryDate;
        
        // Timestamp when the medicine was added
        uint256 addedOn;
    }

    // Mapping to store medicine records by their unique medicineID
    mapping(uint => Medicine) public medicines;

    // Event emitted when a new medicine is added
    event MedicineAdded(uint indexed medicineID, uint manufacturerID, uint256 addedOn);

    /**
     * @notice Adds a new medicine record.
     * @param _manufacturerID The manufacturer ID (must be > 0).
     * @param _medicineName The name of the medicine.
     * @param _medicineID The unique medicine ID (must be > 0).
     * @param _medicineType The medicine type as a string (selectable from: "tablet", "capsule", "syrup", "injection").
     * @param _strength The strength value (as a uint).
     * @param _batchNumber The batch number (as a uint).
     * @param _storageConditions Storage conditions details.
     * @param _currency The currency type as a string (selectable from: "USD", "INR", "EUR").
     * @param _price The price of the medicine (must be > 0).
     * @param _manufactureDate The manufacture date (e.g., "YYYY-MM-DD").
     * @param _expiryDate The expiry date (e.g., "YYYY-MM-DD").
     */
    function addMedicine(
        uint _manufacturerID,
        string memory _medicineName,
        uint _medicineID,
        string memory _medicineType,
        uint _strength,
        uint _batchNumber,
        string memory _storageConditions,
        string memory _currency,
        uint _price,
        string memory _manufactureDate,
        string memory _expiryDate
    ) public {
        // Validate numeric fields
        require(_manufacturerID > 0, "Manufacturer ID is required.");
        require(_medicineID > 0, "Medicine ID is required.");
        require(_strength > 0, "Strength is required.");
        require(_batchNumber > 0, "Batch Number is required.");
        require(_price > 0, "Price must be greater than zero.");

        // Validate string inputs
        require(bytes(_medicineName).length > 0, "Medicine Name is required.");
        require(bytes(_storageConditions).length > 0, "Storage Conditions are required.");
        require(bytes(_manufactureDate).length > 0, "Manufacture Date is required.");
        require(bytes(_expiryDate).length > 0, "Expiry Date is required.");

        // Validate selectable options
        require(isValidMedicineType(_medicineType), "Invalid medicine type.");
        require(isValidCurrency(_currency), "Invalid currency type.");

        // Ensure that the medicine is not already added (medicineID is unique)
        require(medicines[_medicineID].medicineID == 0, "Medicine already added.");

        // Create the new medicine record and store it
        Medicine memory newMedicine = Medicine({
            manufacturerID: _manufacturerID,
            medicineName: _medicineName,
            medicineID: _medicineID,
            medicineType: _medicineType,
            strength: _strength,
            batchNumber: _batchNumber,
            storageConditions: _storageConditions,
            currency: _currency,
            price: _price,
            manufactureDate: _manufactureDate,
            expiryDate: _expiryDate,
            addedOn: block.timestamp
        });

        medicines[_medicineID] = newMedicine;
        emit MedicineAdded(_medicineID, _manufacturerID, block.timestamp);
    }

    /**
     * @notice Checks if a given medicine type is valid.
     * @param _medicineType The medicine type to validate.
     * @return True if valid, otherwise false.
     */
    function isValidMedicineType(string memory _medicineType) internal view returns (bool) {
        for (uint i = 0; i < validMedicineTypes.length; i++) {
            if (keccak256(abi.encodePacked(_medicineType)) == keccak256(abi.encodePacked(validMedicineTypes[i]))) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Checks if a given currency type is valid.
     * @param _currency The currency type to validate.
     * @return True if valid, otherwise false.
     */
    function isValidCurrency(string memory _currency) internal view returns (bool) {
        for (uint i = 0; i < validCurrencies.length; i++) {
            if (keccak256(abi.encodePacked(_currency)) == keccak256(abi.encodePacked(validCurrencies[i]))) {
                return true;
            }
        }
        return false;
    }
}
