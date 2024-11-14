from lcapy import Circuit, s
import sympy as sp

# Define the circuit
cct = Circuit()

# Add components with explicit values
cct.add('V 1 0 10')       # Voltage source of 10V between node 1 and ground
cct.add('R 1 2 1000')     # Resistor of 1k Ohms (1000 Ohms) between nodes 1 and 2
cct.add('C 2 3 1e-6')     # Capacitor of 1 uF between nodes 2 and 3
cct.add('L 3 0 1e-3')     # Inductor of 1 mH between node 3 and ground

# Optional: Draw the circuit to verify components visually
cct.draw()

# Use sympy to symbolically define node voltages and currents if lcapy is unable to directly calculate them
V1, V2, V3 = sp.symbols('V1 V2 V3')  # Define symbolic variables for voltages
I_R1 = (V1 - V2) / 1000             # Current through resistor R1
I_C1 = sp.simplify((V2 - V3) * s * 1e-6)  # Current through capacitor C1
I_L1 = sp.simplify(V3 / (s * 1e-3))       # Current through inductor L1

print("\nBranch Currents:")
print(f"I_R1 (through R1): {I_R1}")
print(f"I_C1 (through C1): {I_C1}")
print(f"I_L1 (through L1): {I_L1}")
