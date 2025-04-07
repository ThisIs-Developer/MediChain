// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MedicineManagement {
    // Enum representing different states of a medicine
    enum MedicineState {
        Manufactured, // 0
        InStock,      // 1
        Sold,         // 2
        Expired       // 3
    }

    // Struct to store medicine details
    struct Medicine {
        string manufacturerId;
        string medicineName;
        string medicineId;
        string medicineType;
        string strength;
        string batchNumber;
        string storageConditions;
        uint256 manufactureDate;
        uint256 expiryDate;
        uint256 price;    // Price per unit (includes tax/commissions)
        uint256 quantity; // Current available quantity (will decrease with sales)
        MedicineState state;
    }

    // Struct to group input parameters for adding a medicine
    struct MedicineInput {
        string manufacturerId;
        string medicineName;
        string medicineId;
        string medicineType;
        string strength;
        string batchNumber;
        string storageConditions;
        uint256 manufactureDate;
        uint256 expiryDate;
        uint256 price;    // base price
        uint256 quantity;
    }

    // Struct for recording manufacturer-added history
    struct MedicineAddition {
        string medicineId;
        string manufacturerId;
        string medicineName;
        uint256 price;      // price per unit after tax
        uint256 quantity;
        uint256 timestamp;
    }

    // Struct for recording sale history (now contains buyerId as string)
    struct Sale {
        string medicineId;
        string buyerId;      // Buyer identifier (not address)
        uint256 quantity;
        uint256 priceAtSale; // unit price after commission
        uint256 timestamp;
        uint8 buyerType;     // 1 = wholesaler, 2 = pharmacy
    }

    // Constants for percentage adjustments
    uint256 public constant TAX_RATE = 10;              // 10% tax added when manufacturer adds a medicine.
    uint256 public constant COMMISSION_WHOLESALER = 5;    // 5% commission added for wholesaler purchase.
    uint256 public constant COMMISSION_PHARMACY = 3;      // 3% commission added for pharmacy purchase.

    // Mapping to store medicines by their unique ID.
    mapping(string => Medicine) public medicines;
    // Array to store all medicine IDs.
    string[] public medicineIds;

    // Persistent arrays for history.
    MedicineAddition[] public manufacturerHistory;
    Sale[] public saleHistory;

    // Global counter for sold items (cumulative, never decreases).
    uint256 public soldCounter;

    // Events for logging important actions.
    event MedicineAdded(
        string medicineId,
        string medicineName,
        uint256 price,
        uint256 quantity,
        string manufacturerId,
        uint256 timestamp
    );
    event MedicinePurchased(
        string medicineId,
        string buyerId,      // buyerId instead of address
        uint256 price,
        uint256 quantity,
        uint256 timestamp,
        uint8 buyerType
    );
    event MedicineStateUpdated(
        string medicineId,
        MedicineState newState,
        uint256 timestamp
    );
    event ManufacturerHistoryRecorded(
        string medicineId,
        string manufacturerId,
        string medicineName,
        uint256 price,
        uint256 quantity,
        uint256 timestamp
    );
    event SaleHistoryRecorded(
        string medicineId,
        string buyerId,      // buyerId instead of address
        uint256 quantity,
        uint256 priceAtSale,
        uint256 timestamp,
        uint8 buyerType
    );

    // Modifier to ensure only the manufacturer of a medicine can update it.
    // In production, consider using a role-based access control.
    modifier onlyManufacturer(string memory _medicineId, string memory _manufacturerId) {
        require(
            keccak256(bytes(medicines[_medicineId].manufacturerId)) ==
            keccak256(bytes(_manufacturerId)),
            "Only manufacturer can perform this action"
        );
        _;
    }

    /**
     * @dev Adds a new medicine to the system.
     * The base price is increased by TAX_RATE.
     * The medicine is recorded in the Manufactured state.
     * Also stores a manufacturer addition record.
     */
    function addMedicine(MedicineInput calldata input) public {
        require(
            bytes(medicines[input.medicineId].medicineId).length == 0,
            "Medicine already exists"
        );

        // Apply tax: priceWithTax = base price + (base price * TAX_RATE/100)
        uint256 priceWithTax = input.price + ((input.price * TAX_RATE) / 100);

        medicines[input.medicineId] = Medicine({
            manufacturerId: input.manufacturerId,
            medicineName: input.medicineName,
            medicineId: input.medicineId,
            medicineType: input.medicineType,
            strength: input.strength,
            batchNumber: input.batchNumber,
            storageConditions: input.storageConditions,
            manufactureDate: input.manufactureDate,
            expiryDate: input.expiryDate,
            price: priceWithTax,
            quantity: input.quantity,
            state: MedicineState.Manufactured
        });
        medicineIds.push(input.medicineId);

        // Record the addition in history.
        manufacturerHistory.push(MedicineAddition({
            medicineId: input.medicineId,
            manufacturerId: input.manufacturerId,
            medicineName: input.medicineName,
            price: priceWithTax,
            quantity: input.quantity,
            timestamp: block.timestamp
        }));
        emit ManufacturerHistoryRecorded(
            input.medicineId,
            input.manufacturerId,
            input.medicineName,
            priceWithTax,
            input.quantity,
            block.timestamp
        );
        emit MedicineAdded(
            input.medicineId,
            input.medicineName,
            priceWithTax,
            input.quantity,
            input.manufacturerId,
            block.timestamp
        );
    }

    /**
     * @dev Purchases a medicine.
     * The function requires an additional parameter buyerType:
     * - buyerType = 1: Wholesaler purchase (medicine must be in Manufactured state)
     * - buyerType = 2: Pharmacy purchase (medicine must be in InStock state)
     *
     * Also, the caller provides a buyerId (as a string) instead of using their address.
     *
     * For a wholesaler, the unit price is increased by COMMISSION_WHOLESALER% and the state is updated to InStock.
     * For a pharmacy, the unit price is increased by COMMISSION_PHARMACY%.
     * The global soldCounter is incremented and the sale is recorded in saleHistory.
     */
    function purchaseMedicine(
        string memory _medicineId,
        uint256 _quantity,
        uint8 buyerType, // 1 for wholesaler, 2 for pharmacy
        string memory _buyerId
    ) public payable {
        Medicine storage med = medicines[_medicineId];
        require(bytes(med.medicineId).length > 0, "Medicine not found");

        if (buyerType == 1) {
            // Wholesaler purchase from Manufacturer.
            require(med.state == MedicineState.Manufactured, "Medicine not available for wholesaler purchase");
            require(med.quantity >= _quantity, "Not enough stock");
            require(msg.value >= med.price * _quantity, "Insufficient funds");
            uint256 commission = (med.price * COMMISSION_WHOLESALER) / 100;
            uint256 updatedPrice = med.price + commission;

            // Transition state to InStock for wholesaler-held inventory.
            med.state = MedicineState.InStock;
            med.price = updatedPrice;

            saleHistory.push(Sale({
                medicineId: _medicineId,
                buyerId: _buyerId,
                quantity: _quantity,
                priceAtSale: updatedPrice,
                timestamp: block.timestamp,
                buyerType: buyerType
            }));
            emit SaleHistoryRecorded(_medicineId, _buyerId, _quantity, updatedPrice, block.timestamp, buyerType);
            emit MedicinePurchased(_medicineId, _buyerId, updatedPrice, _quantity, block.timestamp, buyerType);
        } else if (buyerType == 2) {
            // Pharmacy purchase from Wholesaler.
            require(med.state == MedicineState.InStock, "Medicine not available for pharmacy purchase");
            require(med.quantity >= _quantity, "Not enough stock");
            require(msg.value >= med.price * _quantity, "Insufficient funds");
            uint256 commission = (med.price * COMMISSION_PHARMACY) / 100;
            uint256 updatedPrice = med.price + commission;

            // If quantity becomes 0, mark as Sold.
            if (_quantity >= med.quantity) {
                med.state = MedicineState.Sold;
            }
            med.price = updatedPrice;
            soldCounter += _quantity;

            saleHistory.push(Sale({
                medicineId: _medicineId,
                buyerId: _buyerId,
                quantity: _quantity,
                priceAtSale: updatedPrice,
                timestamp: block.timestamp,
                buyerType: buyerType
            }));
            emit SaleHistoryRecorded(_medicineId, _buyerId, _quantity, updatedPrice, block.timestamp, buyerType);
            emit MedicinePurchased(_medicineId, _buyerId, updatedPrice, _quantity, block.timestamp, buyerType);
        } else {
            revert("Invalid buyer type");
        }
    }

    /**
     * @dev Updates the state of a medicine.
     * Only the manufacturer (verified by _manufacturerId) can update the state.
     */
    function updateMedicineState(
        string memory _medicineId,
        MedicineState _state,
        string memory _manufacturerId
    ) public onlyManufacturer(_medicineId, _manufacturerId) {
        require(bytes(medicines[_medicineId].medicineId).length > 0, "Medicine not found");
        medicines[_medicineId].state = _state;
        emit MedicineStateUpdated(_medicineId, _state, block.timestamp);
    }

    /**
     * @dev Retrieves a specific medicine's details.
     * (An auto-generated getter for the medicines mapping is also available.)
     */
    function getMedicine(string memory _medicineId) public view returns (Medicine memory) {
        require(bytes(medicines[_medicineId].medicineId).length > 0, "Medicine not found");
        return medicines[_medicineId];
    }

    /**
     * @dev Retrieves the total number of medicines.
     */
    function getMedicineCount() public view returns (uint256) {
        return medicineIds.length;
    }

    /**
     * @dev Retrieves all medicines stored in the contract.
     */
    function getAllMedicines() public view returns (Medicine[] memory) {
        Medicine[] memory allMeds = new Medicine[](medicineIds.length);
        for (uint256 i = 0; i < medicineIds.length; i++) {
            allMeds[i] = medicines[medicineIds[i]];
        }
        return allMeds;
    }
}