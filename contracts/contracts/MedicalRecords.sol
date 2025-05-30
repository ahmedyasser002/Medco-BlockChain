// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MedicalRecords {
    struct Record {
        string patientName;
        string diagnosis;
        string treatment;
        uint256 timestamp;
    }

    // Mapping from patient address to their records
    mapping(address => Record[]) private patientRecords;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can add records");
        _;
    }

    // Add a new medical record for a specific address
    function addRecord(
        address _patientAddress,
        string memory _patientName,
        string memory _diagnosis,
        string memory _treatment
    ) public onlyOwner {
        patientRecords[_patientAddress].push(Record({
            patientName: _patientName,
            diagnosis: _diagnosis,
            treatment: _treatment,
            timestamp: block.timestamp
        }));
    }

    // Get all records for a specific address
    function getRecordsByAddress(address _patientAddress) 
        public 
        view 
        returns (Record[] memory) 
    {
        return patientRecords[_patientAddress];
    }

    // Get record count for a specific address
    function getRecordCountByAddress(address _patientAddress)
        public
        view
        returns (uint256)
    {
        return patientRecords[_patientAddress].length;
    }
}