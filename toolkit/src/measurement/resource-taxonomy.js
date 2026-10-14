export const RESOURCE_TAXONOMY=[
  {
    "service": "Direct labour",
    "step": "Direct labour",
    "unit": "LH",
    "basis": "Person-hours spent executing the activity, by trade; retain planned, actual and remaining values separately."
  },
  {
    "service": "Indirect labour",
    "step": "Indirect labour",
    "unit": "LH",
    "basis": "Supervision, logistics and support hours; separate from direct installation earning."
  },
  {
    "service": "Plant and equipment",
    "step": "Plant and equipment",
    "unit": "plant-h",
    "basis": "Operating or assigned hours by equipment type; define whether standby is included. Where individual plant resources are introduced, use this resource as a parent group only."
  },
  {
    "service": "Excavation",
    "step": "Excavation",
    "unit": "m³",
    "basis": "In-situ excavation volume by material and work area; distinguish from loose haulage volume."
  },
  {
    "service": "Backfill",
    "step": "Backfill",
    "unit": "m³",
    "basis": "Placed and compacted volume by material; state the compacted measurement basis."
  },
  {
    "service": "Piles",
    "step": "Piles",
    "unit": "No.",
    "basis": "Count of installed piles, classified by pile type and diameter. Where installed length is monitored, use a separate resource measured in metres."
  },
  {
    "service": "Concrete",
    "step": "Concrete",
    "unit": "m³",
    "basis": "Net volume placed by grade and structural element, supported by pour records and take-offs."
  },
  {
    "service": "Reinforcement",
    "step": "Reinforcement",
    "unit": "t",
    "basis": "Weight installed by element; state treatment of laps and couplers; exclude waste from installed earning."
  },
  {
    "service": "Formwork",
    "step": "Formwork",
    "unit": "m²",
    "basis": "Contact area erected by formwork type; striking tracked separately if included in the work scope."
  },
  {
    "service": "Structural steel",
    "step": "Structural steel",
    "unit": "t",
    "basis": "Weight erected by element; distinguish erection, bolting, inspection and completion credit."
  },
  {
    "service": "Precast elements",
    "step": "Precast elements",
    "unit": "No.",
    "basis": "Count of installed elements by type and location; define installation and acceptance stages."
  },
  {
    "service": "Masonry and partitions",
    "step": "Masonry and partitions",
    "unit": "m²",
    "basis": "Net installed wall/partition area by type; define openings and finishing stages."
  },
  {
    "service": "Cladding and roofing",
    "step": "Cladding and roofing",
    "unit": "m²",
    "basis": "Installed area by system, with weather-tightness and inspection stages separately defined."
  },
  {
    "service": "Floors, ceilings and finishes",
    "step": "Floors, ceilings and finishes",
    "unit": "m²",
    "basis": "Completed area by finish type and location; avoid aggregating unlike finishes."
  },
  {
    "service": "Doors and shutters",
    "step": "Doors and shutters",
    "unit": "No.",
    "basis": "Identified installed assemblies by type; completion includes the specified hardware and checks."
  },
  {
    "service": "Piping",
    "step": "metres",
    "unit": "m",
    "basis": "Installed centreline length by service, material, nominal size and pipe specification."
  },
  {
    "service": "Piping",
    "step": "supports",
    "unit": "No.",
    "basis": "Count of completed supports by type and location; define installation and inspection requirements."
  },
  {
    "service": "Piping",
    "step": "welds",
    "unit": "dia-in",
    "basis": "Sum of nominal pipe size in inches for each completed weld joint; split shop/field and joint type."
  },
  {
    "service": "Piping",
    "step": "valves and inline equipment",
    "unit": "No.",
    "basis": "Installed tagged items by type and size; track testing separately."
  },
  {
    "service": "Piping",
    "step": "insulation",
    "unit": "m²",
    "basis": "Surface area insulated by type and thickness; cladding/jacketing separate where relevant."
  },
  {
    "service": "Mechanical equipment",
    "step": "Mechanical equipment",
    "unit": "No.",
    "basis": "Tagged pumps, chillers, AHUs, vessels and other items; separate equipment classes and installation stages."
  },
  {
    "service": "Ducting",
    "step": "installation",
    "unit": "m²",
    "basis": "Developed surface area of installed ductwork by type and pressure class; define fittings measurement."
  },
  {
    "service": "Ducting",
    "step": "equipment",
    "unit": "No.",
    "basis": "Dampers, grilles, diffusers and other defined items, by type and size. Exclude equipment already measured under mechanical equipment."
  },
  {
    "service": "Ducting",
    "step": "insulation",
    "unit": "m²",
    "basis": "Surface area insulated by type and thickness; cladding/jacketing separate where relevant."
  },
  {
    "service": "Fire protection pipe",
    "step": "Fire protection pipe",
    "unit": "m",
    "basis": "Installed centreline length by size and material; welding uses the separate dia-in resource where applicable."
  },
  {
    "service": "Sprinkler heads",
    "step": "Sprinkler heads",
    "unit": "No.",
    "basis": "Installed heads by type and zone; completion evidence linked to inspection records."
  },
  {
    "service": "Primary containment",
    "step": "supports",
    "unit": "No.",
    "basis": "Completed supports by type; distinguish from containment length."
  },
  {
    "service": "Primary containment",
    "step": "containment",
    "unit": "m",
    "basis": "Installed tray, ladder, basket, trunking or conduit route length by type, size and service."
  },
  {
    "service": "LV distribution",
    "step": "cable",
    "unit": "m",
    "basis": "Individual cable-run length installed by type, conductor size and core count; not common route length."
  },
  {
    "service": "LV distribution",
    "step": "strapping",
    "unit": "No.",
    "basis": "Installed cable straps, cleats or fixing assemblies by type and spacing requirement; define whether each count represents an individual fixing or a complete assembly."
  },
  {
    "service": "LV distribution",
    "step": "terminations",
    "unit": "No.",
    "basis": "Completed cable ends by type and size; core terminations, if used, shall be a separate defined resource."
  },
  {
    "service": "LV distribution",
    "step": "testing",
    "unit": "No.",
    "basis": "Completed and accepted LV circuits or cable test packages against an agreed register; define the denominator and required tests."
  },
  {
    "service": "MV distribution",
    "step": "cable",
    "unit": "m",
    "basis": "Individual cable-run length installed by type, conductor size and voltage rating; not common route length."
  },
  {
    "service": "MV distribution",
    "step": "strapping",
    "unit": "No.",
    "basis": "Installed cable straps, cleats or fixing assemblies by type and spacing requirement; define whether each count represents an individual fixing or a complete assembly."
  },
  {
    "service": "MV distribution",
    "step": "terminations",
    "unit": "No.",
    "basis": "Completed cable ends by type, size and voltage rating; distinguish single-core and multicore termination assemblies."
  },
  {
    "service": "MV distribution",
    "step": "testing",
    "unit": "No.",
    "basis": "Completed and accepted MV circuits or cable test packages against an agreed register; define the denominator and required tests."
  },
  {
    "service": "Busbar and busway",
    "step": "Busbar and busway",
    "unit": "m",
    "basis": "Installed run length by type and rating. Where joints or tap-offs are counted, use separate resources measured by number."
  },
  {
    "service": "Electrical equipment",
    "step": "Electrical equipment",
    "unit": "No.",
    "basis": "Tagged switchboards, panels, UPS units, transformers and generators, separated by equipment class."
  },
  {
    "service": "Lighting",
    "step": "containment",
    "unit": "m",
    "basis": "Installed containment route length by type and size; exclude lengths already measured under primary containment."
  },
  {
    "service": "Lighting",
    "step": "cable",
    "unit": "m",
    "basis": "Individual installed lighting cable-run length by cable type, conductor size and core count."
  },
  {
    "service": "Lighting",
    "step": "fitout and installation",
    "unit": "No.",
    "basis": "Installed luminaires and defined lighting devices by type and location; state the completion requirements."
  },
  {
    "service": "Lighting",
    "step": "terminations",
    "unit": "No.",
    "basis": "Completed cable-end terminations at luminaires, devices and panels; core terminations shall be separately defined if used."
  },
  {
    "service": "Small power",
    "step": "containment",
    "unit": "m",
    "basis": "Installed containment route length by type and size; exclude lengths already measured under primary containment."
  },
  {
    "service": "Small power",
    "step": "cable",
    "unit": "m",
    "basis": "Individual installed cable-run length by cable type, conductor size and core count."
  },
  {
    "service": "Small power",
    "step": "fitout",
    "unit": "No.",
    "basis": "Installed sockets, switches, isolators and other defined points, separated by item type."
  },
  {
    "service": "Small power",
    "step": "terminations",
    "unit": "No.",
    "basis": "Completed cable-end terminations at accessories, equipment and panels; define the counting boundary."
  },
  {
    "service": "Gas detection",
    "step": "containment",
    "unit": "m",
    "basis": "Installed containment route length by type and size; exclude containment measured elsewhere."
  },
  {
    "service": "Gas detection",
    "step": "cable",
    "unit": "m",
    "basis": "Individual installed gas-detection cable-run length by cable type and specification."
  },
  {
    "service": "Gas detection",
    "step": "fitout",
    "unit": "No.",
    "basis": "Installed tagged detectors, controllers and associated devices by type; calibration and functional testing tracked separately."
  },
  {
    "service": "Gas detection",
    "step": "terminations",
    "unit": "No.",
    "basis": "Completed cable-end terminations at detectors, controllers and associated devices; define the counting boundary."
  },
  {
    "service": "Data",
    "step": "containment",
    "unit": "m",
    "basis": "Installed containment route length by type and size; exclude containment measured elsewhere."
  },
  {
    "service": "Data",
    "step": "cable",
    "unit": "m",
    "basis": "Individual installed copper or fibre cable length by cable type; distinguish cable count from fibres or cores."
  },
  {
    "service": "Data",
    "step": "fitout",
    "unit": "No.",
    "basis": "Installed outlets, patch panels, cabinets and other defined items, separated by equipment type and measurement boundary."
  },
  {
    "service": "Data",
    "step": "terminations",
    "unit": "No.",
    "basis": "Completed copper cable ends or fibre connectors/splices; use separately identified resources where the counting bases differ."
  },
  {
    "service": "Security",
    "step": "containment",
    "unit": "m",
    "basis": "Installed containment route length by type and size; exclude containment measured elsewhere."
  },
  {
    "service": "Security",
    "step": "cable",
    "unit": "m",
    "basis": "Individual installed security cable-run length by cable type and system."
  },
  {
    "service": "Security",
    "step": "fitout",
    "unit": "No.",
    "basis": "Installed cameras, readers, locks, controllers and other tagged devices, separated by item type."
  },
  {
    "service": "Security",
    "step": "terminations",
    "unit": "No.",
    "basis": "Completed cable-end terminations at security devices, controllers and panels; define the counting boundary."
  },
  {
    "service": "Fire alarm",
    "step": "containment",
    "unit": "m",
    "basis": "Installed containment route length by type and size; exclude containment measured elsewhere."
  },
  {
    "service": "Fire alarm",
    "step": "cable",
    "unit": "m",
    "basis": "Individual installed fire-alarm cable-run length by cable type and circuit."
  },
  {
    "service": "Fire alarm",
    "step": "fitout",
    "unit": "No.",
    "basis": "Installed detectors, call points, sounders, interfaces and panels, separated by item type."
  },
  {
    "service": "Fire alarm",
    "step": "terminations",
    "unit": "No.",
    "basis": "Completed cable-end terminations at devices, interfaces and panels; define the counting boundary."
  },
  {
    "service": "BMS",
    "step": "containment",
    "unit": "m",
    "basis": "Installed containment route length by type and size; exclude containment measured elsewhere."
  },
  {
    "service": "BMS",
    "step": "cable",
    "unit": "m",
    "basis": "Individual installed BMS cable-run length by cable type and system."
  },
  {
    "service": "BMS",
    "step": "fitout",
    "unit": "No.",
    "basis": "Installed controllers, panels, sensors and other tagged devices by type; exclude devices measured under instrumentation or another package."
  },
  {
    "service": "BMS",
    "step": "terminations",
    "unit": "No.",
    "basis": "Completed cable-end terminations at controllers, panels and field devices; I/O point verification shall be measured separately where required."
  },
  {
    "service": "Earthing and bonding",
    "step": "Earthing and bonding",
    "unit": "m",
    "basis": "Installed conductor length by type and size. Where electrodes, connections or individual bonds are counted, use separate resources measured by number."
  },
  {
    "service": "Instrumentation",
    "step": "containment",
    "unit": "m",
    "basis": "Installed containment route length by type and size; exclude containment measured elsewhere."
  },
  {
    "service": "Instrumentation",
    "step": "cable",
    "unit": "m",
    "basis": "Individual installed instrumentation cable-run length by cable type, pair/core count and specification."
  },
  {
    "service": "Instrumentation",
    "step": "tubing",
    "unit": "m",
    "basis": "Installed impulse or pneumatic tubing length by material and size."
  },
  {
    "service": "Instrumentation",
    "step": "fitout",
    "unit": "No.",
    "basis": "Installed tagged devices by type; calibration and loop acceptance separately tracked."
  },
  {
    "service": "Instrumentation",
    "step": "terminations",
    "unit": "No.",
    "basis": "Completed cable-end terminations at instruments, junction boxes and panels; core terminations shall be separately defined if used."
  },
  {
    "service": "Instrumentation",
    "step": "loop tests",
    "unit": "No.",
    "basis": "Completed and accepted loops against a fixed loop register; no duplicate credit for repeated tests."
  },
  {
    "service": "Pressure test packs",
    "step": "Pressure test packs",
    "unit": "No.",
    "basis": "Completed and accepted identified packs; pack boundaries and contents agreed before progress earning."
  },
  {
    "service": "Heat tracing",
    "step": "Heat tracing",
    "unit": "m",
    "basis": "Installed heating cable length by type and circuit; distinguish heating cable length from the length of pipe traced. Connections, insulation and testing shall have separately defined credit where included."
  },
  {
    "service": "Electrical test packs",
    "step": "Electrical test packs",
    "unit": "No.",
    "basis": "Accepted electrical test packs against an agreed register; define the denominator and scope. Exclude tests already credited under LV or MV testing unless this measures a separate pack-completion deliverable."
  },
  {
    "service": "Commissioned equipment stages",
    "step": "Commissioned equipment stages",
    "unit": "No.",
    "basis": "Tagged equipment accepted at each defined stage; count each stage separately."
  },
  {
    "service": "Commissioned systems",
    "step": "Commissioned systems",
    "unit": "No.",
    "basis": "Accepted systems/subsystems against defined completion criteria and turnover boundaries."
  },
  {
    "service": "Integrated systems tests",
    "step": "Integrated systems tests",
    "unit": "No.",
    "basis": "Accepted scripts or scenarios; failures and retests reported separately from earned completion."
  },
  {
    "service": "Handover deliverables",
    "step": "Handover deliverables",
    "unit": "No.",
    "basis": "Accepted manuals, drawings, training packages or certificates, using an agreed deliverable register."
  }
];
