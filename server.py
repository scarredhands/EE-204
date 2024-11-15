import numpy as np
import sympy as sp

def solve_passive_circuit(R, C, L, V):
    """
    Solve a passive RLC circuit in the s-domain.

    Parameters:
    R (dict): Resistor values (key: node pair, value: resistance)
    C (dict): Capacitor values (key: node pair, value: capacitance)
    L (dict): Inductor values (key: node pair, value: inductance)
    V (dict): Voltage source values (key: node pair, value: voltage)

    Returns:
    node_voltages (dict): Node voltages
    branch_currents (dict): Branch currents
    """
    # Form KCL matrix equation
    A, b = get_kcl_matrix(R, C, L, V)

    # Solve for node voltages
    s = sp.Symbol('s')
    node_voltages = sp.solve_poly_system(A @ sp.Matrix(list(node_vars.values())) - sp.Matrix(b), list(node_vars.values()))

    # Calculate branch currents
    branch_currents = {}
    for (n1, n2), r in R.items():
        branch_currents[(n1, n2)] = (node_voltages[node_vars[n1]] - node_voltages[node_vars[n2]]) / r
    for (n1, n2), c in C.items():
        branch_currents[(n1, n2)] = s * c * (node_voltages[node_vars[n1]] - node_voltages[node_vars[n2]])
    for (n1, n2), l in L.items():
        branch_currents[(n1, n2)] = (node_voltages[node_vars[n1]] - node_voltages[node_vars[n2]]) / (s * l)

    return node_voltages, branch_currents

def get_kcl_matrix(R, C, L, V):
    """
    Formulate the KCL equations in matrix form for a passive RLC circuit.
    """
    nodes = set()
    for node_pair in (*R.keys(), *C.keys(), *L.keys(), *V.keys()):
        nodes.update(node_pair)
    nodes = sorted(nodes)
    n = len(nodes)

    A = np.zeros((n, n), dtype=sp.Symbol)
    b = np.zeros(n, dtype=sp.Symbol)

    s = sp.Symbol('s')

    global node_vars
    node_vars = {node: sp.Symbol(f'V{node}') for node in nodes}

    for i, node in enumerate(nodes):
        for (n1, n2), r in R.items():
            if node == n1:
                A[i, nodes.index(n2)] += 1 / r
            elif node == n2:
                A[i, nodes.index(n1)] += 1 / r

        for (n1, n2), c in C.items():
            if node == n1:
                A[i, nodes.index(n2)] += s * c
            elif node == n2:
                A[i, nodes.index(n1)] += s * c

        for (n1, n2), l in L.items():
            if node == n1:
                A[i, nodes.index(n2)] += 1 / (s * l)
            elif node == n2:
                A[i, nodes.index(n1)] += 1 / (s * l)

        for (n1, n2), v in V.items():
            if node == n1:
                b[i] += v
            elif node == n2:
                b[i] -= v

    return A, b

R = {(1, 2): 10}
C = {(2, 3): 1}
L = {(3, 0): 10}
V = {(1, 0): 10}

node_voltages, branch_currents = solve_passive_circuit(R, C, L, V)

print("Node Voltages:")
for node, voltage in node_voltages.items():
    print(f"V{node} = {voltage}")

print("\nBranch Currents:")
for branch, current in branch_currents.items():
    print(f"I({'-'.join(map(str, branch))}) = {current}")
# import sympy as sp

# # Define symbolic variables
# s = sp.symbols('s')
# V_dc = 10  # DC voltage source value in Volts

# # Get user inputs for components
# n_components = int(input("Enter the number of components: "))
# components = []
# for i in range(n_components):
#     comp_type = input(f"Enter the type of component {i+1} (R, C, L, V): ")
#     value = float(input(f"Enter the value of component {i+1} ({comp_type} value): "))
#     node1 = int(input(f"Enter the first node for component {i+1}: "))
#     node2 = int(input(f"Enter the second node for component {i+1}: "))
#     components.append({'type': comp_type, 'value': value, 'nodes': (node1, node2)})

# # Define the unique nodes (excluding ground node)
# nodes = set()
# for comp in components:
#     nodes.update(comp['nodes'])
# nodes.discard(0)  # Remove the ground node (node 0)
# node_vars = {node: sp.symbols(f'V{node}') for node in nodes}

# # Define the KCL equations in the Laplace domain
# equations = []
# for node in node_vars:
#     kcl_eq = 0
#     for comp in components:
#         node1, node2 = comp['nodes']
#         if node in (node1, node2):
#             V1 = node_vars.get(node1, 0)  # Node voltage, or 0 for ground
#             V2 = node_vars.get(node2, 0)  # Node voltage, or 0 for ground
            
#             if comp['type'] == 'R':
#                 # Impedance of Resistor: Z_R = R
#                 impedance = comp['value']  # Impedance is just R in the s-domain
#                 current = (V1 - V2) / impedance
#             elif comp['type'] == 'C':
#                 # Impedance of Capacitor: Z_C = 1 / (s * C)
#                 impedance = 1 / (s * comp['value'])
#                 current = (V1 - V2) / impedance
#             elif comp['type'] == 'L':
#                 # Impedance of Inductor: Z_L = s * L
#                 impedance = s * comp['value']
#                 current = (V1 - V2) / impedance
#             elif comp['type'] == 'V':
#                 # DC Voltage Source: V_dc / s (step response)
#                 current = V_dc / s  # The current is governed by the voltage source in the Laplace domain
            
#             # Update KCL equation for the current
#             if node == node1:
#                 kcl_eq += current
#             else:
#                 kcl_eq -= current
    
#     # Add KCL equation for this node
#     equations.append(sp.Eq(kcl_eq, 0))

# # Solve for node voltages
# solutions = sp.solve(equations, list(node_vars.values()))

# # Display node voltages
# print("Node Voltages:")
# for node, voltage in solutions.items():
#     print(f"Voltage at node V{node}: {voltage}")

# # Compute branch currents (current through each component)
# branch_currents = {}
# for comp in components:
#     node1, node2 = comp['nodes']
#     V1 = solutions.get(node_vars.get(node1, 0), 0)
#     V2 = solutions.get(node_vars.get(node2, 0), 0)
    
#     if comp['type'] == 'R':
#         # Current through resistor: I = (V1 - V2) / R
#         current = (V1 - V2) / comp['value']
#     elif comp['type'] == 'C':
#         # Impedance of capacitor: 1 / (s * C)
#         impedance = 1 / (s * comp['value'])
#         current = (V1 - V2) / impedance
#     elif comp['type'] == 'L':
#         # Impedance of inductor: s * L
#         impedance = s * comp['value']
#         current = (V1 - V2) / impedance
#     elif comp['type'] == 'V':
#         # DC voltage source: V / s (step response)
#         current = V_dc / s  # The current is governed by the voltage source in the Laplace domain
    
#     branch_currents[f"Current through {comp['type']} between nodes {comp['nodes']}"] = sp.simplify(current)

# # Display branch currents
# print("\nBranch Currents:")
# for comp_info, current in branch_currents.items():
#     print(f"{comp_info}: {current}")
