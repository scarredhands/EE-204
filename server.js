const spice = require('spicejs');

class CircuitAnalyzer {
    constructor() {
        this.netlist = [];
        this.title = "Circuit Analysis";
    }

    // Add voltage source
    addVoltageSource(name, posNode, negNode, value, type = 'dc', params = {}) {
        let sourceSpec;
        switch(type.toLowerCase()) {
            case 'dc':
                sourceSpec = `${value}`;
                break;
            case 'ac':
                sourceSpec = `AC ${value} ${params.phase || 0}`;
                break;
            case 'pulse':
                sourceSpec = `PULSE(${params.v1 || 0} ${params.v2 || value} ${params.delay || 0} ${params.rise || 0} ${params.fall || 0} ${params.width || 0} ${params.period || 0})`;
                break;
            default:
                sourceSpec = `${value}`;
        }
        this.netlist.push(`V${name} ${posNode} ${negNode} ${sourceSpec}`);
    }

    // Add resistor
    addResistor(name, posNode, negNode, value) {
        this.netlist.push(`R${name} ${posNode} ${negNode} ${value}`);
    }

    // Add capacitor
    addCapacitor(name, posNode, negNode, value) {
        this.netlist.push(`C${name} ${posNode} ${negNode} ${value}`);
    }

    // Add inductor
    addInductor(name, posNode, negNode, value) {
        this.netlist.push(`L${name} ${posNode} ${negNode} ${value}`);
    }

    // Generate complete netlist
    generateNetlist() {
        return [
            this.title,
            ...this.netlist,
            '.end'
        ].join('\n');
    }

    // Perform analysis
    async analyze(analysisType = 'tran', options = {}) {
        try {
            const netlist = this.generateNetlist();
            
            // Create simulation options
            const simOptions = {
                netlist: netlist,
                analysis: {
                    type: analysisType,
                    ...options
                }
            };

            // Run simulation
            const results = await spice.simulate(simOptions);
            return this.processResults(results, analysisType);

        } catch (error) {
            console.error('Circuit Analysis Error:', error);
            throw error;
        }
    }

    // Process simulation results
    processResults(results, analysisType) {
        const processed = {
            type: analysisType,
            data: results
        };

        // Format based on analysis type
        switch(analysisType) {
            case 'op':
                processed.voltages = this.extractNodeVoltages(results);
                processed.currents = this.extractBranchCurrents(results);
                break;
            case 'tran':
                processed.time = results.time;
                processed.voltages = this.extractTimeVoltages(results);
                break;
            case 'ac':
                processed.frequency = results.frequency;
                processed.magnitude = results.magnitude;
                processed.phase = results.phase;
                break;
        }

        return processed;
    }

    // Print analysis results
    printResults(results) {
        console.log(`\n${results.type.toUpperCase()} Analysis Results:`);
        console.log('=====================================');

        switch(results.type) {
            case 'op':
                console.log('\nNode Voltages:');
                for (const [node, voltage] of Object.entries(results.voltages)) {
                    console.log(`Node ${node}: ${voltage.toFixed(3)}V`);
                }
                console.log('\nBranch Currents:');
                for (const [branch, current] of Object.entries(results.currents)) {
                    console.log(`${branch}: ${current.toFixed(3)}A`);
                }
                break;

            case 'tran':
                console.log('\nTransient Analysis:');
                console.log('Time points:', results.time.length);
                for (const [node, values] of Object.entries(results.voltages)) {
                    console.log(`\nNode ${node}:`);
                    console.log(`Initial: ${values[0].toFixed(3)}V`);
                    console.log(`Final: ${values[values.length-1].toFixed(3)}V`);
                }
                break;

            case 'ac':
                console.log('\nAC Analysis:');
                console.log('Frequency points:', results.frequency.length);
                console.log('\nMagnitude and Phase at key frequencies:');
                const indices = [0, Math.floor(results.frequency.length/2), results.frequency.length-1];
                indices.forEach(i => {
                    console.log(`\nAt f = ${results.frequency[i].toFixed(2)} Hz:`);
                    console.log(`Magnitude: ${results.magnitude[i].toFixed(3)}`);
                    console.log(`Phase: ${results.phase[i].toFixed(2)} degrees`);
                });
                break;
        }
    }
}

// Example usage
async function main() {
    try {
        // Create circuit analyzer instance
        const analyzer = new CircuitAnalyzer();

        // Create an RLC circuit example
        analyzer.addVoltageSource('1', 1, 0, 5, 'dc');
        analyzer.addResistor('1', 1, 2, 100);
        analyzer.addInductor('1', 2, 3, 0.1);
        analyzer.addCapacitor('1', 3, 0, 1e-6);

        // Perform DC operating point analysis
        const dcResults = await analyzer.analyze('op');
        analyzer.printResults(dcResults);

        // Perform transient analysis
        const tranResults = await analyzer.analyze('tran', {
            start: 0,
            stop: 0.01,
            step: 0.0001,
            uic: true
        });
        analyzer.printResults(tranResults);

        // Perform AC analysis
        const acResults = await analyzer.analyze('ac', {
            start: 1,
            stop: 1e6,
            points: 100,
            type: 'dec'
        });
        analyzer.printResults(acResults);

    } catch (error) {
        console.error('Error running circuit analysis:', error);
    }
}

// Run the example
if (require.main === module) {
    main();
}

module.exports = CircuitAnalyzer;