// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RegistrationLogin {
    struct User {
        string firstName;
        string lastName;
        string email;
        string phone;
        string role;
        bytes32 passwordHash;
        bool termsAccepted;
    }

    mapping(string => User) private users; // Mapping from email to User
    mapping(string => bool) private registeredEmails; // To check email existence

    event UserRegistered(string email, string role);
    event UserLoggedIn(string email);

    // Modifier to check if the user exists
    modifier userExists(string memory email) {
        require(registeredEmails[email], "User not registered.");
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
        string memory confirmPassword,
        bool terms
    ) public {
        // Validate input
        require(bytes(firstName).length > 0, "First name is required.");
        require(bytes(lastName).length > 0, "Last name is required.");
        require(bytes(email).length > 0, "Email is required.");
        require(bytes(phone).length == 10, "Phone number must be 10 digits.");
        require(
            keccak256(abi.encodePacked(role)) == keccak256(abi.encodePacked("Manufacturer")) ||
            keccak256(abi.encodePacked(role)) == keccak256(abi.encodePacked("Wholesaler")) ||
            keccak256(abi.encodePacked(role)) == keccak256(abi.encodePacked("Distributor")) ||
            keccak256(abi.encodePacked(role)) == keccak256(abi.encodePacked("Pharmacy")) ||
            keccak256(abi.encodePacked(role)) == keccak256(abi.encodePacked("Customer")),
            "Invalid role selected."
        );
        require(
            bytes(password).length >= 8 &&
            hasUpperCase(password) &&
            hasLowerCase(password) &&
            hasNumber(password),
            "Password must meet complexity requirements."
        );
        require(
            keccak256(abi.encodePacked(password)) == keccak256(abi.encodePacked(confirmPassword)),
            "Passwords do not match."
        );
        require(terms, "You must accept the terms and conditions.");
        require(!registeredEmails[email], "Email already registered.");

        // Register user
        users[email] = User(
            firstName,
            lastName,
            email,
            phone,
            role,
            keccak256(abi.encodePacked(password)), // Store password as hash
            terms
        );
        registeredEmails[email] = true;

        emit UserRegistered(email, role);
    }

    // Login function
    function login(string memory email, string memory password)
    public
    userExists(email)
    returns (string memory)
    {
        User memory user = users[email];
        require(
            user.passwordHash == keccak256(abi.encodePacked(password)),
            "Invalid password."
        );

        emit UserLoggedIn(email);
        return "Login successful.";
    }

    // Utility function to check for uppercase
    function hasUpperCase(string memory str) private pure returns (bool) {
        bytes memory b = bytes(str);
        for (uint i = 0; i < b.length; i++) {
            if (b[i] >= 0x41 && b[i] <= 0x5A) {
                return true;
            }
        }
        return false;
    }

    // Utility function to check for lowercase
    function hasLowerCase(string memory str) private pure returns (bool) {
        bytes memory b = bytes(str);
        for (uint i = 0; i < b.length; i++) {
            if (b[i] >= 0x61 && b[i] <= 0x7A) {
                return true;
            }
        }
        return false;
    }

    // Utility function to check for numbers
    function hasNumber(string memory str) private pure returns (bool) {
        bytes memory b = bytes(str);
        for (uint i = 0; i < b.length; i++) {
            if (b[i] >= 0x30 && b[i] <= 0x39) {
                return true;
            }
        }
        return false;
    }
}
