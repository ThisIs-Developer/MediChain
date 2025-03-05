// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AddMedicine {
    string[] private validMedicineTypes = ["tablet", "capsule", "syrup", "injection"];
    string[] private validCurrencies = ["USD", "INR", "EUR"];

    struct Medicine {
        string manufacturerID;
        string medicineName;
        string medicineID;
        string medicineType;
        string strength;
        string batchNumber;
        string storageConditions;
        string currency;
        uint price;
        string manufactureDate;
        string expiryDate;
        uint256 addedOn;
    }

    mapping(string => Medicine) public medicines;
    event MedicineAdded(string indexed medicineID, string manufacturerID, uint256 addedOn);

    function addMedicine(
        string memory _manufacturerID,
        string memory _medicineName,
        string memory _medicineID,
        string memory _medicineType,
        string memory _strength,
        string memory _batchNumber,
        string memory _storageConditions,
        string memory _currency,
        uint _price,
        string memory _manufactureDate,
        string memory _expiryDate
    ) public {
        require(bytes(_manufacturerID).length > 0, "Manufacturer ID required.");
        require(bytes(_medicineName).length > 0, "Medicine Name required.");
        require(bytes(_medicineID).length > 0, "Medicine ID required.");
        require(bytes(_medicineType).length > 0, "Medicine Type required.");
        require(bytes(_strength).length > 0, "Strength required.");
        require(bytes(_batchNumber).length > 0, "Batch Number required.");
        require(bytes(_storageConditions).length > 0, "Storage Conditions required.");
        require(bytes(_currency).length > 0, "Currency required.");
        require(_price > 0, "Price must be > 0.");
        require(bytes(_manufactureDate).length > 0, "Manufacture Date required.");
        require(bytes(_expiryDate).length > 0, "Expiry Date required.");
        require(isValidMedicineType(_medicineType), "Invalid medicine type.");
        require(isValidCurrency(_currency), "Invalid currency type.");
        require(bytes(medicines[_medicineID].medicineID).length == 0, "Medicine already added.");

        medicines[_medicineID] = Medicine({
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
        emit MedicineAdded(_medicineID, _manufacturerID, block.timestamp);
    }

    function isValidMedicineType(string memory _medicineType) internal view returns (bool) {
        for (uint i = 0; i < validMedicineTypes.length; i++) {
            if (keccak256(abi.encodePacked(_medicineType)) == keccak256(abi.encodePacked(validMedicineTypes[i]))) {
                return true;
            }
        }
        return false;
    }

    function isValidCurrency(string memory _currency) internal view returns (bool) {
        for (uint i = 0; i < validCurrencies.length; i++) {
            if (keccak256(abi.encodePacked(_currency)) == keccak256(abi.encodePacked(validCurrencies[i]))) {
                return true;
            }
        }
        return false;
    }
}
