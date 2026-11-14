
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract IdentityAccessManager is Ownable {

    enum Role {
        NONE,
        STUDENT,
        FACULTY,
        ADMIN
    }

    struct Identity {
        bool isRegistered;
        bool isActive;
        Role role;
        uint256 registeredAt;
    }

    mapping(address => Identity) public identities;

    event IdentityRegistered(address indexed user);
    event RoleAssigned(address indexed user, Role role);
    event IdentityDeactivated(address indexed user);
    event IdentityReactivated(address indexed user);

    constructor() Ownable(msg.sender) {}

    // Register identity
    function registerIdentity() external {
        require(
            !identities[msg.sender].isRegistered,
            "Already registered"
        );

        identities[msg.sender] = Identity({
            isRegistered: true,
            isActive: true,
            role: Role.NONE,
            registeredAt: block.timestamp
        });

        emit IdentityRegistered(msg.sender);
    }

    // Admin assigns role
    function assignRole(
        address user,
        Role role
    ) external onlyOwner {
        require(identities[user].isRegistered, "Not registered");
        require(role == Role.STUDENT || role == Role.FACULTY,
        "Invalid role");

        identities[user].role = role;

        emit RoleAssigned(user, role);
    }

    // Verify identity
    function verifyIdentity(
        address user
    ) external view returns (bool) {
        return identities[user].isRegistered &&
               identities[user].isActive;
    }

    // Check access
    function checkAccess(
        address user,
        Role requiredRole
    ) external view returns (bool) {
        Identity memory identity = identities[user];

        return identity.isRegistered &&
               identity.isActive &&
               (identity.role == requiredRole ||
                identity.role == Role.ADMIN);
    }

    // Deactivate identity
    function deactivateIdentity(
        address user
    ) external onlyOwner {
        require(identities[user].isRegistered, "Not registered");
        require(identities[user].isActive, "Already inactive");

        identities[user].isActive = false;

        emit IdentityDeactivated(user);
    }

    // Reactivate identity
    function reactivateIdentity(
        address user
    ) external onlyOwner {
        require(identities[user].isRegistered, "Not registered");
        require(!identities[user].isActive, "Already active");

        identities[user].isActive = true;

        emit IdentityReactivated(user);
    }

    // Get identity
    function getIdentity(
        address user
    ) external view returns (
        bool,
        bool,
        Role,
        uint256
    ) {
        Identity memory identity = identities[user];

        return (
            identity.isRegistered,
            identity.isActive,
            identity.role,
            identity.registeredAt
        );
    }
}
