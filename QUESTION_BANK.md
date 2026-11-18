# DCCN Quiz Arena - Question Bank (Draft 1)

**Course:** CSE2251 - Data Communication and Computer Networks  
**Format:** 10 interactive challenges, one mark each, 10 marks total  
**Difficulty:** Very simple / introductory  
**Marking:** Correctness only; no negative marking, speed bonus, streak bonus, or time-based marks.  
**Feedback:** Answer explanations are shown after full submission.

Questions below were drafted from the supplied Theory.zip PDFs. Wording is intentionally basic. The routing edge weights and graph are an original practice example, while the routing principle is from Module 3.2.

| Q | Topic | Student interaction | Expected answer / scoring | Source |
|---|---|---|---|---|
| 1 | Network topologies | Select the diagram where all computers connect to one central device. | Star topology. 1 mark for selecting Star. | Module 1.1, slide 27 |
| 2 | Transmission media | Classify four examples as guided or unguided. | Twisted pair = guided; coaxial = guided; optical fiber = guided; radio waves = unguided. 1 mark only if all four are classified correctly. | Module 1.2, slides 5-6 and 17-18 |
| 3 | OSI model / Physical Layer | Tap the Physical Layer in a 7-layer OSI stack. | Physical Layer. 1 mark for selecting Physical. | Module 1.1, slide 72; Module 1.2, slide 3 |
| 4 | Data transmission modes | Match three examples with simplex, half-duplex, or full-duplex. | Keyboard-to-computer = simplex; walkie-talkie = half-duplex; telephone = full-duplex. 1 mark only if all three are correct. | Module 1.1, slides 13-15 |
| 5 | Transmission errors | Classify two descriptions. | One bit changed = single-bit error; two or more bits changed = burst error. 1 mark only if both are correct. | Module 2.1, slides 19-20 |
| 6 | Ethernet / Switch | Tap the network device that examines the destination MAC address and forwards a frame to the appropriate port. | Switch. 1 mark for selecting Switch. | Module 2.2, slides 15-16 |
| 7 | Wi-Fi / IEEE 802.11 | Tap five steps in their correct order. | Find network -> Connect -> Prepare data in wireless frame -> Transmit -> Forward data. 1 mark only for the complete correct order. | Module 2.3, slide 5 |
| 8 | Packet switching | Move all three packet pieces into the destination tray to reassemble the message. | All three packets are reassembled at the destination. 1 mark when all pieces are moved. | Module 3.1, slides 9-10 |
| 9 | Routing / least-cost path | Select adjacent nodes on a weighted graph from A to F. Do not choose from MCQ route options. | A -> C -> F. Cost = 8 (4+4), hops = 2. A -> B -> D -> F also costs 8 but has 3 hops, so fewer hops breaks the cost tie. 1 mark for A-C-F. | Routing principle: Module 3.2, slides 3-6 and 10. Quiz graph and weights are original practice material. |
| 10 | IPv4 dotted-decimal format | Enter four decimal octets to build a valid IPv4 address. | Four decimal numbers; each 0-255; no unnecessary leading zeros. 1 mark if all four fields pass. | Module 3.1, slides 22-23, 40 and 50-51 |

## Route challenge graph

Undirected links and costs:

- A-B: 2
- A-C: 4
- B-D: 2
- B-E: 5
- C-D: 3
- C-F: 4
- D-F: 4
- E-F: 2

The two lowest-cost routes are A-C-F (cost 8, 2 hops) and A-B-D-F (cost 8, 3 hops). The quiz instruction explicitly states: minimize total cost first, then choose fewer hops when costs are equal. Therefore A-C-F is the unique expected answer under that rule.

## Content and fairness notes

- No advanced calculations or Bellman-Ford table calculations are required.
- Questions 2, 4, 5 and 7 have several simple sub-actions but each whole challenge is worth one mark.
- Do not award bonus marks for answering quickly or for leaderboard position.
- The answer key should remain in trusted backend code/data in the production build; this static prototype contains the client-side answer logic and must not be used as an official assessment deployment.
- Review the questions with the faculty before the official quiz. Faculty may adjust topic weightage or remove any question not yet taught.
