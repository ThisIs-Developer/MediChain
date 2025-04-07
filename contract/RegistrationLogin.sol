// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RegistrationLogin {
    struct Address {
        string street;
        string city;
        string state;
        string zip;
    }

    struct User {
        string id;              // New field ID
        string firstName;
        string lastName;
        bytes32 emailHash;
        string phone;
        string role;
        bytes32 passwordHash;
        bool termsAccepted;
        Address addressDetails;
        bool active;            // Account active flag
        uint256 deactivatedTimestamp; // Timestamp when the account was deactivated (0 if active)
    }

    struct UserInput {
        string id;              // New field ID
        string firstName;
        string lastName;
        string email;
        string phone;
        string role;
        string password;
        bool terms;
        Address addressDetails;
    }

    mapping(bytes32 => User) private users;
    mapping(bytes32 => bool) private registeredEmails;
    bytes32[] private allUserEmails;

    // Mapping for password reset tokens (email hash => reset token)
    mapping(bytes32 => bytes32) private passwordResetTokens;

    event UserRegistered(string email, string role);
    event UserLoggedIn(string email);
    event AddressUpdated(string email);
    event PasswordUpdated(string email);
    event AccountDeactivated(string email);
    event AccountDeleted(string email);
    event AccountReactivated(string email);
    // Events for password reset handling
    event PasswordResetRequested(string email);
    event PasswordReset(string email);

    string[] private validRoles = ["Manufacturer", "Wholesaler", "Distributor", "Pharmacy", "Customer"];

    modifier userExists(bytes32 emailHash) {
        require(registeredEmails[emailHash], "User not registered.");
        _;
    }

    modifier onlyActive(bytes32 emailHash) {
        require(users[emailHash].active, "Account is not active.");
        _;
    }

    function register(UserInput memory input) public {
        bytes32 emailHash = keccak256(abi.encodePacked(input.email));

        require(bytes(input.firstName).length > 0, "First name is required.");
        require(bytes(input.lastName).length > 0, "Last name is required.");
        require(bytes(input.email).length > 0, "Email is required.");
        require(bytes(input.phone).length == 10, "Phone number must be 10 digits.");
        require(isValidRole(input.role), "Invalid role selected.");
        require(bytes(input.password).length >= 8, "Password must be at least 8 characters.");
        require(input.terms, "You must accept the terms and conditions.");
        require(!registeredEmails[emailHash], "Email already registered.");

        users[emailHash] = User(
            input.id,                    // new id field
            input.firstName,
            input.lastName,
            emailHash,
            input.phone,
            input.role,
            keccak256(abi.encodePacked(input.password)),
            input.terms,
            input.addressDetails,
            true,                        // active by default
            0                            // deactivatedTimestamp = 0 when active
        );

        registeredEmails[emailHash] = true;
        allUserEmails.push(emailHash);

        emit UserRegistered(input.email, input.role);
    }

    function login(string memory email, string memory password)
        public
        userExists(keccak256(abi.encodePacked(email)))
        onlyActive(keccak256(abi.encodePacked(email)))
        returns (string memory)
    {
        bytes32 emailHash = keccak256(abi.encodePacked(email));
        User memory user = users[emailHash];
        require(user.passwordHash == keccak256(abi.encodePacked(password)), "Invalid password.");

        emit UserLoggedIn(email);
        return "Login successful.";
    }

    function getUserDetails(string memory email, string memory password)
        public
        view
        userExists(keccak256(abi.encodePacked(email)))
        onlyActive(keccak256(abi.encodePacked(email)))
        returns (User memory)
    {
        bytes32 emailHash = keccak256(abi.encodePacked(email));
        User memory user = users[emailHash];
        require(user.passwordHash == keccak256(abi.encodePacked(password)), "Invalid password.");
        return user;
    }

    function getAllUserDetails() public view returns (User[] memory) {
        uint256 count = allUserEmails.length;
        User[] memory userList = new User[](count);
        for (uint256 i = 0; i < count; i++) {
            userList[i] = users[allUserEmails[i]];
        }
        return userList;
    }

    // Returns the deactivation timestamp (0 if account is active)
    function getDeactivationTimestamp(string memory email) public view returns (uint256) {
        bytes32 emailHash = keccak256(abi.encodePacked(email));
        return users[emailHash].deactivatedTimestamp;
    }

    // Update the user's address
    function updateAddress(
        string memory email, 
        string memory password, 
        Address memory newAddress
    ) public userExists(keccak256(abi.encodePacked(email))) onlyActive(keccak256(abi.encodePacked(email))) {
        bytes32 emailHash = keccak256(abi.encodePacked(email));
        require(users[emailHash].passwordHash == keccak256(abi.encodePacked(password)), "Invalid password.");
        users[emailHash].addressDetails = newAddress;
        emit AddressUpdated(email);
    }

    // Update the user's password (when the user remembers the current one)
    function updatePassword(
        string memory email, 
        string memory oldPassword, 
        string memory newPassword
    ) public userExists(keccak256(abi.encodePacked(email))) onlyActive(keccak256(abi.encodePacked(email))) {
        bytes32 emailHash = keccak256(abi.encodePacked(email));
        User storage user = users[emailHash];
        require(user.passwordHash == keccak256(abi.encodePacked(oldPassword)), "Invalid current password.");
        require(bytes(newPassword).length >= 8, "New password must be at least 8 characters.");
        user.passwordHash = keccak256(abi.encodePacked(newPassword));
        emit PasswordUpdated(email);
    }

    // Deactivate the user's account: record the timestamp of deactivation
    function deactivateAccount(string memory email, string memory password)
        public
        userExists(keccak256(abi.encodePacked(email)))
        onlyActive(keccak256(abi.encodePacked(email)))
    {
        bytes32 emailHash = keccak256(abi.encodePacked(email));
        require(users[emailHash].passwordHash == keccak256(abi.encodePacked(password)), "Invalid password.");
        users[emailHash].active = false;
        users[emailHash].deactivatedTimestamp = block.timestamp;
        emit AccountDeactivated(email);
    }

    // Delete the user's account
    function deleteAccount(string memory email, string memory password)
        public
        userExists(keccak256(abi.encodePacked(email)))
    {
        bytes32 emailHash = keccak256(abi.encodePacked(email));
        require(users[emailHash].passwordHash == keccak256(abi.encodePacked(password)), "Invalid password.");
        registeredEmails[emailHash] = false;
        delete users[emailHash];
        removeUserEmail(emailHash);
        emit AccountDeleted(email);
    }

    // Reactivate the user's account if 30 days have passed since deactivation
    function reactivateAccount(string memory email, string memory password)
        public
        userExists(keccak256(abi.encodePacked(email)))
        returns (string memory)
    {
        bytes32 emailHash = keccak256(abi.encodePacked(email));
        User storage user = users[emailHash];
        require(!user.active, "Account is already active.");
        require(user.passwordHash == keccak256(abi.encodePacked(password)), "Invalid password.");
        require(block.timestamp >= user.deactivatedTimestamp + 30 days, "Account can only be reactivated after 30 days.");
        user.active = true;
        user.deactivatedTimestamp = 0; // Reset deactivation timestamp
        emit AccountReactivated(email);
        return "Account reactivated.";
    }

    // --- New functions for Forgot Password handling ---

    // This function allows a user to request a password reset.
    // It generates a reset token and emits an event for off-chain handling.
    function requestPasswordReset(string memory email)
        public
        userExists(keccak256(abi.encodePacked(email)))
        onlyActive(keccak256(abi.encodePacked(email)))
        returns (bytes32)
    {
        bytes32 emailHash = keccak256(abi.encodePacked(email));
        // Generate a reset token; in a production scenario, use a secure random generator.
        bytes32 token = keccak256(abi.encodePacked(email, block.timestamp));
        passwordResetTokens[emailHash] = token;
        emit PasswordResetRequested(email);
        return token;
    }

    // This function allows a user to reset their password using a valid reset token.
    function resetPassword(
        string memory email,
        string memory newPassword,
        bytes32 token
    )
        public
        userExists(keccak256(abi.encodePacked(email)))
        onlyActive(keccak256(abi.encodePacked(email)))
    {
        bytes32 emailHash = keccak256(abi.encodePacked(email));
        require(passwordResetTokens[emailHash] == token, "Invalid reset token.");
        require(bytes(newPassword).length >= 8, "New password must be at least 8 characters.");
        
        users[emailHash].passwordHash = keccak256(abi.encodePacked(newPassword));
        // Clear the token once used
        delete passwordResetTokens[emailHash];
        emit PasswordReset(email);
    }

    // --- End of new functions ---

    // Helper function to remove email hash from the allUserEmails array
    function removeUserEmail(bytes32 emailHash) private {
        uint256 count = allUserEmails.length;
        for (uint256 i = 0; i < count; i++) {
            if (allUserEmails[i] == emailHash) {
                allUserEmails[i] = allUserEmails[count - 1];
                allUserEmails.pop();
                break;
            }
        }
    }

    function isValidRole(string memory role) private view returns (bool) {
        for (uint256 i = 0; i < validRoles.length; i++) {
            if (keccak256(abi.encodePacked(role)) == keccak256(abi.encodePacked(validRoles[i]))) {
                return true;
            }
        }
        return false;
    }
}