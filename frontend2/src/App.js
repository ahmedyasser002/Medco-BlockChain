import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import MedicalRecordsContract from './contracts/MedicalRecords.json';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [contract, setContract] = useState(null);
  const [records, setRecords] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Separate search input state
  const [currentPatientAddress, setCurrentPatientAddress] = useState(''); // Currently displayed address

  // Initialize Web3 and contract
  useEffect(() => {
    const init = async () => {
      try {
        if (window.ethereum) {
          const web3Instance = new Web3(window.ethereum);
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          setWeb3(web3Instance);

          const accounts = await web3Instance.eth.getAccounts();
          setAccounts(accounts);

          const networkId = await web3Instance.eth.net.getId();
          const deployedNetwork = MedicalRecordsContract.networks[networkId];
          
          const contractInstance = new web3Instance.eth.Contract(
            MedicalRecordsContract.abi,
            deployedNetwork && deployedNetwork.address
          );
          setContract(contractInstance);

          const owner = await contractInstance.methods.owner().call();
          setIsOwner(owner.toLowerCase() === accounts[0].toLowerCase());
        } else {
          throw new Error('Please install MetaMask');
        }
      } catch (err) {
        setError(err.message);
      }
    };

    init();
  }, []);

  // Load records for a specific address
  const loadRecords = async (address) => {
    if (!contract || !web3.utils.isAddress(address)) {
      setRecords([]); // Clear records if address is invalid
      setCurrentPatientAddress(''); // Reset current patient address
      return;
    }

    setLoading(true);
    setError('');
    try {
      const count = await contract.methods.getRecordCountByAddress(address).call();
      const recordCount = parseInt(count.toString(), 10);

      const records = await contract.methods.getRecordsByAddress(address).call();

      const formattedRecords = records.map((record, index) => ({
        id: index,
        patientName: record.patientName,
        diagnosis: record.diagnosis,
        treatment: record.treatment,
        timestamp: new Date(parseInt(record.timestamp.toString()) * 1000).toLocaleString(),
        patientAddress: address
      }));

      setRecords(formattedRecords);
      setCurrentPatientAddress(web3.utils.toChecksumAddress(address));
    } catch (err) {
      setError(`Failed to load records: ${err.message}`);
      setRecords([]);
      setCurrentPatientAddress('');
    } finally {
      setLoading(false);
    }
  };

  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    
    // Clear records immediately if input becomes invalid
    if (!web3 || !web3.utils.isAddress(value)) {
      setRecords([]);
      setCurrentPatientAddress('');
    }
  };

  // Handle search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadRecords(searchInput);
  };

  const handleAddRecord = async (values, { resetForm }) => {
    if (!contract || !isOwner) return;

    setLoading(true);
    try {
      await contract.methods.addRecord(
        web3.utils.toChecksumAddress(values.patientAddress),
        values.patientName,
        values.diagnosis,
        values.treatment
      ).send({ from: accounts[0] });

      // Refresh records for the added patient
      await loadRecords(values.patientAddress);
      resetForm();
    } catch (err) {
      setError(`Failed to add record: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const recordSchema = Yup.object().shape({
    patientAddress: Yup.string()
      .required('Patient address is required')
      .test('is-address', 'Invalid Ethereum address', (value) => 
        web3?.utils.isAddress(value)),
    patientName: Yup.string().required('Patient name is required'),
    diagnosis: Yup.string().required('Diagnosis is required'),
    treatment: Yup.string().required('Treatment is required')
  });

  return (
    <div className="container mt-4">
      <h1 className="text-center mb-4">Medical Records DApp</h1>
      
      {error && (
        <div className="alert alert-danger">
          {error}
          <button className="btn-close float-end" onClick={() => setError('')} />
        </div>
      )}

      {!web3 ? (
        <div className="alert alert-warning">
          Please install MetaMask to use this application.
        </div>
      ) : (
        <>
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h3>Search Patient Records</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSearchSubmit}>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter 0x address (e.g., 0x742d35Cc6634C0532925a3b844Bc454e4438f44e)"
                    value={searchInput}
                    onChange={handleSearchChange}
                  />
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={loading || !web3.utils.isAddress(searchInput)}
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {isOwner && (
            <div className="card mb-4">
              <div className="card-header bg-success text-white">
                <h3>Add New Medical Record</h3>
              </div>
              <div className="card-body">
                <Formik
                  initialValues={{
                    patientAddress: '',
                    patientName: '',
                    diagnosis: '',
                    treatment: ''
                  }}
                  validationSchema={recordSchema}
                  onSubmit={handleAddRecord}
                >
                  {({ isSubmitting, isValid }) => (
                    <Form>
                      <div className="mb-3">
                        <label className="form-label">Patient Address</label>
                        <Field
                          name="patientAddress"
                          type="text"
                          className="form-control"
                          placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                        />
                        <ErrorMessage
                          name="patientAddress"
                          component="div"
                          className="text-danger small"
                        />
                      </div>

                      {/* Rest of the form fields remain the same */}
                      <div className="mb-3">
                        <label className="form-label">Patient Name</label>
                        <Field
                          name="patientName"
                          type="text"
                          className="form-control"
                        />
                        <ErrorMessage
                          name="patientName"
                          component="div"
                          className="text-danger small"
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Diagnosis</label>
                        <Field
                          name="diagnosis"
                          as="textarea"
                          className="form-control"
                          rows="3"
                        />
                        <ErrorMessage
                          name="diagnosis"
                          component="div"
                          className="text-danger small"
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Treatment</label>
                        <Field
                          name="treatment"
                          as="textarea"
                          className="form-control"
                          rows="3"
                        />
                        <ErrorMessage
                          name="treatment"
                          component="div"
                          className="text-danger small"
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={isSubmitting || !isValid}
                      >
                        {isSubmitting ? 'Adding...' : 'Add Record'}
                      </button>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header bg-secondary text-white">
              <h3>
                {currentPatientAddress ? `Records for ${currentPatientAddress}` : 'Patient Records'}
                {records.length > 0 && (
                  <span className="badge bg-light text-dark ms-2">
                    {records.length}
                  </span>
                )}
              </h3>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : records.length === 0 ? (
                <div className="alert alert-info">
                  {searchInput 
                    ? web3.utils.isAddress(searchInput) 
                      ? `No records found for ${searchInput}`
                      : 'Please enter a valid Ethereum address'
                    : 'Enter a patient 0x address to view records'}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Patient</th>
                        <th>Diagnosis</th>
                        <th>Treatment</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr key={record.id}>
                          <td>{record.id}</td>
                          <td>{record.patientName}</td>
                          <td>{record.diagnosis}</td>
                          <td>{record.treatment}</td>
                          <td>{record.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;