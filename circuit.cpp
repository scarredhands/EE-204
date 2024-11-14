#include <iostream>
#include <vector>
#include <complex>
#include <memory>
#include <cmath>
#include <Eigen/Dense>
#include <iomanip>

using namespace std;
using namespace Eigen;

typedef complex<double> Complex;

enum class SourceType {
    DC,         // DC source: V
    STEP,       // Step function: V*u(t)
    SINE        // Sinusoidal: V*sin(ωt)
};

class InputSource {
    double amplitude;
    SourceType type;
    double frequency;  // For sinusoidal sources

public:
    InputSource(double amp, SourceType t, double freq = 0) 
        : amplitude(amp), type(t), frequency(freq) {}

    Complex getLaplaceTransform(Complex s) const {
        switch(type) {
            case SourceType::DC:
                return amplitude / s;
            case SourceType::STEP:
                return amplitude / s;
            case SourceType::SINE:
                return (amplitude * frequency) / (s*s + frequency*frequency);
            default:
                return Complex(0, 0);
        }
    }

    string getTimeDomainExpression() const {
        switch(type) {
            case SourceType::DC:
                return to_string(amplitude) + "V";
            case SourceType::STEP:
                return to_string(amplitude) + "V * u(t)";
            case SourceType::SINE:
                return to_string(amplitude) + "V * sin(" + to_string(frequency) + "t)";
            default:
                return "Unknown";
        }
    }

    double getAmplitude() const { return amplitude; }
    SourceType getType() const { return type; }
};

class Circuit {
private:
    struct Node {
        vector<pair<int, double>> resistors;    // <connected_node, resistance>
        vector<pair<int, double>> capacitors;   // <connected_node, capacitance>
        vector<pair<int, double>> inductors;    // <connected_node, inductance>
    };

    vector<Node> nodes;
    InputSource source;
    int sourceNode;
    int groundNode;
    int numNodes;

public:
    Circuit(InputSource src, int srcNode, int gndNode, int totalNodes) 
        : source(src), sourceNode(srcNode), groundNode(gndNode), numNodes(totalNodes) {
        nodes.resize(totalNodes);
    }

    void addResistor(int n1, int n2, double r) {
        nodes[n1].resistors.push_back({n2, r});
        nodes[n2].resistors.push_back({n1, r});
    }

    void addCapacitor(int n1, int n2, double c) {
        nodes[n1].capacitors.push_back({n2, c});
        nodes[n2].capacitors.push_back({n1, c});
    }

    void addInductor(int n1, int n2, double l) {
        nodes[n1].inductors.push_back({n2, l});
        nodes[n2].inductors.push_back({n1, l});
    }

    void analyze() {
        cout << "\nCircuit Analysis\n";
        cout << "================\n";

        cout << "\n1. Time Domain Circuit:\n";
        cout << "Input: " << source.getTimeDomainExpression() << endl;
        printComponents();

        cout << "\n2. Frequency Domain (s-domain) Circuit:\n";
        printSDomainCircuit();

        cout << "\n3. Node Voltage Solutions (Frequency Domain):\n";
        solveNodeVoltages();

        cout << "\n4. Time-Domain Voltages and Currents:\n";
        double t;
        cout << "Enter the time value for time-domain analysis (in seconds): ";
        cin >> t;
        computeTimeDomainVoltagesAndCurrents(t);
    }

private:
    MatrixXcd getAdmittanceMatrix(Complex s) {
        MatrixXcd Y = MatrixXcd::Zero(numNodes - 1, numNodes - 1);
        
        for(int i = 1; i < numNodes; i++) {
            for(const auto& r : nodes[i].resistors) {
                if(r.first == groundNode) {
                    Y(i-1, i-1) += Complex(1.0/r.second, 0);
                } else if(r.first > groundNode) {
                    Y(i-1, r.first-1) -= Complex(1.0/r.second, 0);
                    Y(i-1, i-1) += Complex(1.0/r.second, 0);
                }
            }
            for(const auto& c : nodes[i].capacitors) {
                Complex admittance = s * Complex(c.second, 0);
                if(c.first == groundNode) {
                    Y(i-1, i-1) += admittance;
                } else if(c.first > groundNode) {
                    Y(i-1, c.first-1) -= admittance;
                    Y(i-1, i-1) += admittance;
                }
            }
            for(const auto& l : nodes[i].inductors) {
                Complex admittance = Complex(1.0, 0) / (s * Complex(l.second, 0));
                if(l.first == groundNode) {
                    Y(i-1, i-1) += admittance;
                } else if(l.first > groundNode) {
                    Y(i-1, l.first-1) -= admittance;
                    Y(i-1, i-1) += admittance;
                }
            }
        }
        
        return Y;
    }

    VectorXcd getCurrentVector(Complex s) {
        VectorXcd I = VectorXcd::Zero(numNodes - 1);
        
        if(sourceNode > groundNode) {
            I(sourceNode - 1) = source.getLaplaceTransform(s) / Complex(1e-6, 0);
        }
        
        return I;
    }

    vector<double> solveAtTime(double t) {
        const int N = 1000;
        const double sigma = 0.1;
        vector<double> voltages(numNodes, 0.0);
        
        voltages[groundNode] = 0.0;
        
        for(int node = 1; node < numNodes; node++) {
            Complex sum(0, 0);
            for(int k = 0; k < N; k++) {
                double omega = 0.1 + k * 0.1;
                Complex s(sigma, omega);
                
                MatrixXcd Y = getAdmittanceMatrix(s);
                VectorXcd I = getCurrentVector(s);
                VectorXcd V = Y.colPivHouseholderQr().solve(I);
                
                Complex fk = V(node - 1) * exp(s * Complex(t, 0));
                sum += fk * Complex(0, 0.1);
            }
            
            voltages[node] = (sum / Complex(2 * M_PI, 0)).real();
        }
        
        return voltages;
    }

    void solveNodeVoltages() {
        Complex s(0, 10);  // Example for frequency analysis
        MatrixXcd Y = getAdmittanceMatrix(s);
        VectorXcd I = getCurrentVector(s);
        VectorXcd V = Y.colPivHouseholderQr().solve(I);
        
        for(int i = 0; i < numNodes - 1; i++) {
            cout << "V" << i+1 << "(s) = " << V(i) << " V\n";
        }
    }

    void computeTimeDomainVoltagesAndCurrents(double t) {
        vector<double> voltages = solveAtTime(t);

        cout << "\nTime-Domain Analysis at t = " << t << " seconds:\n";
        for(int i = 0; i < numNodes; i++) {
            cout << "V" << i << "(t) = " << fixed << setprecision(4) 
                 << voltages[i] << " V\n";
        }

        for (int i = 0; i < numNodes; i++) {
            for (const auto& resistor : nodes[i].resistors) {
                double voltageDiff = voltages[i] - voltages[resistor.first];
                double current = voltageDiff / resistor.second;
                cout << "Current through resistor R" << i << resistor.first 
                     << " at t = " << t << "s: " << fixed << setprecision(4) 
                     << current << " A\n";
            }
        }
    }

    void printComponents() const {
        for(int i = 0; i < numNodes; i++) {
            for(const auto& r : nodes[i].resistors) {
                if(i < r.first) {
                    cout << "R" << i << r.first << " = " << r.second << " Ω\n";
                }
            }
            for(const auto& c : nodes[i].capacitors) {
                if(i < c.first) {
                    cout << "C" << i << c.first << " = " << c.second << " F\n";
                }
            }
            for(const auto& l : nodes[i].inductors) {
                if(i < l.first) {
                    cout << "L" << i << l.first << " = " << l.second << " H\n";
                }
            }
        }
    }

    void printSDomainCircuit() const {
        cout << "Source (Laplace Transform): " << source.getLaplaceTransform(Complex(1, 0)) << endl;
    }
};

int main() {
    InputSource source(10, SourceType::DC);
    Circuit circuit(source, 1, 0, 2);

    circuit.addResistor(1, 0, 1000);
    //circuit.addCapacitor(1, 2, 1e-6);
    //circuit.addInductor(2, 0, 0.01);

    circuit.analyze();
    return 0;
}
