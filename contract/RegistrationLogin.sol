// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RegistrationLogin {
    struct User {
        string firstName;
        string lastName;
        bytes32 emailHash; // Use hashed email for storage
        string phone;
        string role;
        bytes32 passwordHash; // Store only the hashed password
        bool termsAccepted;
    }

    mapping(bytes32 => User) private users; // Mapping from hashed email to User
    mapping(bytes32 => bool) private registeredEmails; // To check email existence

    event UserRegistered(string email, string role);
    event UserLoggedIn(string email);

    string[] private validRoles = [
        "Manufacturer",
        "Wholesaler",
        "Distributor",
        "Pharmacy",
        "Customer"
    ];

    // Modifier to check if the user exists
    modifier userExists(bytes32 emailHash) {
        require(registeredEmails[emailHash], "User not registered.");
        _;
    }

    // Registration function
    function register(
        string memory firstName,
        string memory lastName,
        string memory email,
        string memory phone,
        string memory role,
        string memory password,
        bool terms
    ) public {
        bytes32 emailHash = keccak256(abi.encodePacked(email));

        // Validate input
        require(bytes(firstName).length > 0, "First name is required.");
        require(bytes(lastName).length > 0, "Last name is required.");
        require(bytes(email).length > 0, "Email is required.");
        require(bytes(phone).length == 10, "Phone number must be 10 digits.");
        require(isValidRole(role), "Invalid role selected.");
        require(
            bytes(password).length >= 8 &&
            hasUpperCase(password) &&
            hasLowerCase(password) &&
            hasNumber(password),
            "Password must meet complexity requirements."
        );
        require(terms, "You must accept the terms and conditions.");
        require(!registeredEmails[emailHash], "Email already registered.");

        // Register user
        users[emailHash] = User(
            firstName,
            lastName,
            emailHash,
            phone,
            role,
            keccak256(abi.encodePacked(password)), // Store password as a hash
            terms
        );
        registeredEmails[emailHash] = true;

        emit UserRegistered(email, role);
    }

    // Login function
    function login(string memory email, string memory password)
        public
        userExists(keccak256(abi.encodePacked(email)))
        returns (string memory)
    {
        bytes32 emailHash = keccak256(abi.encodePacked(email));
        User memory user = users[emailHash];

        require(
            user.passwordHash == keccak256(abi.encodePacked(password)),
            "Invalid password."
        );

        emit UserLoggedIn(email);
        return "Login successful.";
    }

    // Check if the role is valid
    function isValidRole(string memory role) private view returns (bool) {
        for (uint256 i = 0; i < validRoles.length; i++) {
            if (keccak256(abi.encodePacked(role)) == keccak256(abi.encodePacked(validRoles[i]))) {
                return true;
            }
        }
        return false;
    }

    // Utility function to check for uppercase
    function hasUpperCase(string memory str) private pure returns (bool) {
        bytes memory b = bytes(str);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x41 && b[i] <= 0x5A) {
                return true;
            }
        }
        return false;
    }

    // Utility function to check for lowercase
    function hasLowerCase(string memory str) private pure returns (bool) {
        bytes memory b = bytes(str);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x61 && b[i] <= 0x7A) {
                return true;
            }
        }
        return false;
    }

    // Utility function to check for numbers
    function hasNumber(string memory str) private pure returns (bool) {
        bytes memory b = bytes(str);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x30 && b[i] <= 0x39) {
                return true;
            }
        }
        return false;
    }
}
