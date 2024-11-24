import React, { useState } from 'react';
import { Trash2, Plus, Play } from 'lucide-react';

export default function CircuitAnalyzer() {
  const [elements, setElements] = useState([]);
  const [equations, setEquations] = useState([]);
  const [activeTab, setActiveTab] = useState('builder');
  // const [netlist, setNetlist] = useState('');
  // const [result, setResult] = useState(null);
  // const [error, setError] = useState(null);


  // const handleNetlistChange = (e) => {
  //   setNetlist(e.target.value);
  // };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setError(null);
  //   setResult(null);
  const elementTypes = [
    { type: 'R', name: 'Resistor', valueUnit: 'Ω' },
    { type: 'L', name: 'Inductor', valueUnit: 'H' },
    { type: 'C', name: 'Capacitor', valueUnit: 'F' },
    { type: 'V', name: 'Voltage Source', valueUnit: 'V' },
    { type: 'I', name: 'Current Source', valueUnit: 'A' },
    { type: 'E', name: 'VCVS', valueUnit: 'gain' },
    { type: 'G', name: 'VCCS', valueUnit: 'gain' },
    { type: 'H', name: 'CCVS', valueUnit: 'gain' },
    { type: 'F', name: 'CCCS', valueUnit: 'gain' },
    { type: 'O', name: 'Op Amp', valueUnit: 'gain' }
  ];

  const addElement = (type) => {
    const newElement = {
      id: Date.now(),
      type: type,
      name: `${type}${elements.filter(e => e.type === type).length + 1}`,
      pNode: '',
      nNode: '',
      value: '',
      ...(type === 'E' || type === 'G' ? { cpNode: '', cnNode: '' } : {}),
      ...(type === 'O' ? { vOut: '' } : {}),
      ...(type === 'H' || type === 'F' ? { vName: '' } : {})
    };
    setElements([...elements, newElement]);
  };

  const removeElement = (id) => {
    setElements(elements.filter(element => element.id !== id));
  };

  const updateElement = (id, field, value) => {
    setElements(elements.map(element => 
      element.id === id ? { ...element, [field]: value } : element
    ));
  };

  const generateNetlist = () => {
    return elements.map(element => {
      switch(element.type) {
        case 'R':
        case 'L':
        case 'C':
        case 'V':
        case 'I':
          return `${element.name} ${element.pNode} ${element.nNode} ${element.value}`;
        case 'E':
        case 'G':
          return `${element.name} ${element.pNode} ${element.nNode} ${element.cpNode} ${element.cnNode} ${element.value}`;
        case 'H':
        case 'F':
          return `${element.name} ${element.pNode} ${element.nNode} ${element.vName} ${element.value}`;
        case 'O':
          return `${element.name} ${element.pNode} ${element.nNode} ${element.vOut}`;
        default:
          return '';
      }
    }).join('\n');
  };

  const analyzeCircuit = async () => {
    try {
      const netlist = generateNetlist();
      console.log(netlist);

      // Send the netlist to the backend
      const response = await fetch('http://localhost:5001/process-netlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ netlist }) // Send the netlist as JSON
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze circuit');
      }
  
      const data = await response.json();
      if (data.status === 'success') {
        setEquations([`Equations:\n${data.results.output}`]);
        setActiveTab('results');
      } else {
        setEquations([`Error: ${data.message}`]);
      }
    } catch (error) {
      console.error('Circuit analysis failed:', error);
      setEquations([`Error: ${error.message}`]);
    }
  };
   // Automatically trigger analysis when the component loads
  //  React.useEffect(() => {
  //   analyzeCircuit();
  // }, []);

  // return (
  //   <div className="max-w-6xl mx-auto p-6">
  //     <div className="bg-gray-50 p-6 rounded">
  //       <h2 className="text-xl font-bold mb-4">Analysis Results</h2>
  //       <pre className="whitespace-pre-wrap font-mono bg-white p-4 rounded border">
  //         {equations.join('\n')}
  //       </pre>
  //     </div>
  //   </div>
  // );
  

  const renderElementInputs = (element) => {
    const baseInputs = (
      <>
        <input
          type="text"
          className="w-20 p-2 border rounded"
          value={element.pNode}
          onChange={(e) => updateElement(element.id, 'pNode', e.target.value)}
          placeholder="P Node"
        />
        <input
          type="text"
          className="w-20 p-2 border rounded"
          value={element.nNode}
          onChange={(e) => updateElement(element.id, 'nNode', e.target.value)}
          placeholder="N Node"
        />
      </>
    );

    const valueInput = (
      <input
        type="text"
        className="w-24 p-2 border rounded"
        value={element.value}
        onChange={(e) => updateElement(element.id, 'value', e.target.value)}
        placeholder="Value"
      />
    );

    const controlledSourceInputs = (
      <>
        <input
          type="text"
          className="w-20 p-2 border rounded"
          value={element.cpNode}
          onChange={(e) => updateElement(element.id, 'cpNode', e.target.value)}
          placeholder="CP Node"
        />
        <input
          type="text"
          className="w-20 p-2 border rounded"
          value={element.cnNode}
          onChange={(e) => updateElement(element.id, 'cnNode', e.target.value)}
          placeholder="CN Node"
        />
      </>
    );

    switch(element.type) {
      case 'E':
      case 'G':
        return (
          <>
            {baseInputs}
            {controlledSourceInputs}
            {valueInput}
          </>
        );
      case 'H':
      case 'F':
        return (
          <>
            {baseInputs}
            <input
              type="text"
              className="w-24 p-2 border rounded"
              value={element.vName}
              onChange={(e) => updateElement(element.id, 'vName', e.target.value)}
              placeholder="V Name"
            />
            {valueInput}
          </>
        );
      case 'O':
        return (
          <>
            {baseInputs}
            <input
              type="text"
              className="w-20 p-2 border rounded"
              value={element.vOut}
              onChange={(e) => updateElement(element.id, 'vOut', e.target.value)}
              placeholder="V Out"
            />
          </>
        );
      default:
        return (
          <>
            {baseInputs}
            {valueInput}
          </>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            className={`px-4 py-2 rounded ${activeTab === 'builder' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveTab('builder')}
          >
            Circuit Builder
          </button>
          <button
            className={`px-4 py-2 rounded ${activeTab === 'results' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveTab('results')}
          >
            Results
          </button>
        </div>
      </div>

      {activeTab === 'builder' ? (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Add Elements</h2>
            <div className="flex flex-wrap gap-2">
              {elementTypes.map(({ type, name }) => (
                <button
                  key={type}
                  onClick={() => addElement(type)}
                  className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Circuit Elements</h2>
            <div className="space-y-4">
              {elements.map(element => (
                <div key={element.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded">
                  <span className="font-medium w-24">{element.name}</span>
                  {renderElementInputs(element)}
                  <button
                    onClick={() => removeElement(element.id)}
                    className="p-2 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={analyzeCircuit}
            className="flex items-center px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Play className="w-5 h-5 mr-2" />
            Analyze Circuit
          </button>
        </>
      ) : (
        <div className="bg-gray-50 p-6 rounded">
          <h2 className="text-xl font-bold mb-4">Analysis Results</h2>
          <pre className="whitespace-pre-wrap font-mono bg-white p-4 rounded border">
            {equations.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}