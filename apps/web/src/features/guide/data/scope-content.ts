/**
 * ขอบเขตเนื้อหาที่ใช้ในการแข่งขัน — the six categories, transcribed from the competition's own
 * scope document (`BH26 - ขอบเขตเนื้อหาที่ใช้ในการแข่งขัน.docx`, BH26-AC-02, 19 ส.ค. 2569).
 *
 * WHAT WAS TAKEN, AND WHAT WAS DELIBERATELY LEFT
 *
 * The docx states each category as a Heading2 (`หมวดที่ N …`) plus a one-paragraph intro, and
 * then puts the actual syllabus in a THREE-COLUMN TABLE: หัวข้อ (Thai) | Topic (English) |
 * ระดับ (L1/L2/L3/นอกขอบเขต). Figma's modal (`2074:2551` → `2074:2954`) renders that table as
 * flowing prose — numbered sub-headings (`2074:2955`, 24/33.6) each followed by a plain bullet
 * list (`2074:2956`, 16/25.6) — so this file holds the same shape and NOT a table.
 *
 * The ระดับ column is dropped, by instruction. That has one consequence worth stating: the 8
 * rows whose level reads `นอกขอบเขต` are topics the document lists in order to declare them
 * OUT of scope, and their meaning lives entirely in the column being dropped. Rendered as
 * ordinary bullets they would read as required material — the precise opposite of what the
 * document says — so they are omitted rather than silently promoted. Dropped, by category:
 * 3.4 ×1, 4.1 ×1, 4.4 ×2, 4.5 ×2, 5.1 ×1, 6.2 ×1.
 *
 * The counts are NOT transcribed: `SCOPE_CATEGORIES[i].groups.length` is what the card's
 * "N หัวข้อ" shows, so the card cannot drift from the list behind it. They come to 4/3/5/5/2/4
 * = 23, which is the docx's own summary table ("6 หมวด รวม 23 หัวข้อใหญ่"). Figma's cards read
 * 4, 3, 5, 5, 5, 5 — the last two are placeholder copy (their layers are still named
 * 'อัลกอริทึม Container' and '3 Container'), and they would make the total 25, so the
 * document wins.
 *
 * Generated once from the docx and then owned by hand — regenerating is not part of the build.
 */

/** One numbered sub-section of a category: `1.1 …` and the topics under it. */
export interface ScopeGroup {
  /** e.g. `1.1 เลขคณิตและทฤษฎีจำนวน (Arithmetic and Number Theory)` — Figma 2074:2955 */
  heading: string;
  /** e.g. `จำนวนเต็มและสมบัติของจำนวนเต็ม (Integers and properties of integers)` — 2074:2956 */
  items: string[];
}

export interface ScopeCategory {
  /** 1-6, the docx's own หมวดที่ number and the order the cards sit in */
  n: number;
  /** the category's Thai name, without the `หมวดที่ N` prefix — the card's and the tab's title */
  th: string;
  /** its English name. Figma's CARDS abbreviate this with `&` and card 3's string is stored
      truncated mid-phrase ('Programming Fundamentals & Data '), which is authoring drift
      rather than a designed abbreviation — the document's full name is used at both sizes. */
  en: string;
  /** the paragraph the docx puts under the heading, before the table */
  intro: string;
  groups: ScopeGroup[];
}

export const SCOPE_CATEGORIES: ScopeCategory[] = [
  {
    en: "Computational Mathematics",
    groups: [
      {
        heading: "1.1 เลขคณิตและทฤษฎีจำนวน (Arithmetic and Number Theory)",
        items: [
          "จำนวนเต็มและสมบัติของจำนวนเต็ม (Integers and properties of integers)",
          "การหารลงตัว ตัวหารร่วมมาก และตัวคูณร่วมน้อย (Divisibility, GCD, LCM)",
          "อัลกอริทึมของยุคลิด (Euclid's algorithm)",
          "เศษส่วน อัตราส่วน และร้อยละ (Fractions, ratios and percentages)",
          "การแปลงฐานเลข (Radix conversion)",
          "เลขคณิตมอดุลาร์ (Modular arithmetic)",
          "จำนวนเฉพาะ และการทดสอบความเป็นจำนวนเฉพาะใน O(√N) (Prime numbers, primality test in O(√N))",
          "ตะแกรงของเอราทอสเทนีส (Sieve of Eratosthenes)",
          "การแยกตัวประกอบ (Integer factorization)",
          "การยกกำลังอย่างมีประสิทธิภาพ (Efficient exponentiation, fast power)",
          "ตัวผกผันการคูณเชิงมอดุลาร์ (Modular multiplicative inverse)",
          "การยกกำลังเมทริกซ์ (Matrix exponentiation)",
        ],
      },
      {
        heading: "1.2 พีชคณิต ลำดับ และอนุกรม (Algebra, Sequences and Series)",
        items: [
          "ลำดับเลขคณิตและลำดับเรขาคณิต (Arithmetic and geometric sequences)",
          "อนุกรมและผลรวมในรูปปิด (Series and closed-form summation)",
          "จำนวนฟีโบนักชี และความสัมพันธ์เวียนบังเกิด (Fibonacci numbers and recurrence relations)",
          "เมทริกซ์และการดำเนินการพื้นฐาน (Matrices and basic operations)",
          "จำนวนจริง เลขทศนิยมลอยตัว และความคลาดเคลื่อนเชิงตัวเลข (Real numbers, floating point and numerical error)",
          "สมการเชิงเส้นและระบบสมการเชิงเส้นขนาดเล็ก (Linear equations and small linear systems)",
        ],
      },
      {
        heading:
          "1.3 เรขาคณิตวิเคราะห์และเรขาคณิตเชิงคำนวณเบื้องต้น (Analytic and Basic Computational Geometry)",
        items: [
          "จุด เวกเตอร์ และพิกัดคาร์ทีเซียน (Points, vectors and Cartesian coordinates)",
          "ระยะทางแบบยูคลิด และทฤษฎีบทพีทาโกรัส (Euclidean distance, Pythagorean theorem)",
          "มุม สามเหลี่ยม สี่เหลี่ยมผืนผ้า สี่เหลี่ยมจัตุรัส และวงกลม (Angle, triangle, rectangle, square, circle)",
          "ส่วนของเส้นตรง จุดตัดของเส้นตรง และสมบัติพื้นฐานที่เกี่ยวข้อง (Line segments, intersections and related properties)",
          "ผลคูณเชิงสเกลาร์ และผลคูณไขว้ (Dot product and cross product)",
          "การทดสอบทิศทางการหมุนของสามจุด (Orientation test)",
          "พื้นที่รูปหลายเหลี่ยม (สูตรเชือกผูกรองเท้า) (Polygon area, shoelace formula)",
          "รูปหลายเหลี่ยม และการตรวจว่าจุดอยู่ภายในรูปหลายเหลี่ยม (Polygons and point-in-polygon test)",
        ],
      },
      {
        heading: "1.4 ความน่าจะเป็นและสถิติ (Probability and Statistics)",
        items: [
          "ค่าเฉลี่ย มัชฌิม มัธยฐาน ฐานนิยม และส่วนเบี่ยงเบนมาตรฐาน (Mean, median, mode and standard deviation)",
          "ความน่าจะเป็นเบื้องต้น (Basic probability)",
          "ค่าคาดหมาย (Expected value)",
        ],
      },
    ],
    intro:
      "ความรู้ทางคณิตศาสตร์ที่ใช้เป็นเครื่องมือในการวิเคราะห์และแก้ปัญหาเชิงคำนวณ เน้นการนำไปใช้ในการเขียนโปรแกรมมากกว่าการพิสูจน์ทางทฤษฎี",
    n: 1,
    th: "คณิตศาสตร์เชิงคำนวณ",
  },
  {
    en: "Discrete Structures and Graph Theory",
    groups: [
      {
        heading: "2.1 ฟังก์ชัน ความสัมพันธ์ เซต และตรรกศาสตร์ (Functions, Relations, Sets and Logic)",
        items: [
          "เซตและการดำเนินการของเซต (Sets and set operations)",
          "ฟังก์ชันและความสัมพันธ์ (Functions and relations)",
          "ตรรกศาสตร์พื้นฐานและตารางค่าความจริง (Basic logic and truth tables)",
          "การดำเนินการระดับบิต (Bitwise operations)",
        ],
      },
      {
        heading: "2.2 การนับและการจัดหมู่ (Counting and Combinatorics)",
        items: [
          "กฎการบวกและกฎการคูณ (Sum rule and product rule)",
          "หลักการเพิ่มเข้าและตัดออก (Inclusion-exclusion principle)",
          "กฎรังนกพิราบ (Pigeonhole principle)",
          "การเรียงสับเปลี่ยนและการจัดหมู่ระดับพื้นฐาน (Basic permutations and combinations)",
          "สัมประสิทธิ์ทวินามและสามเหลี่ยมปาสกาล (Binomial coefficients and Pascal triangle)",
          "ฟังก์ชันแฟกทอเรียล (Factorial function)",
        ],
      },
      {
        heading: "2.3 กราฟและต้นไม้ (Graphs and Trees)",
        items: [
          "นิยามของกราฟ และการแทนกราฟด้วยรายการประชิดและเมทริกซ์ประชิด (Graph definitions, adjacency list and adjacency matrix)",
          "ต้นไม้และสมบัติพื้นฐานของต้นไม้ (Trees and properties of trees)",
          "กราฟไม่มีทิศทาง: ดีกรี วิถี วัฏจักร ความเชื่อมโยง และบทตั้งการจับมือ (Undirected graphs: degree, path, cycle, connectedness, Handshaking Lemma)",
          "กราฟมีทิศทาง: ดีกรีเข้า ดีกรีออก วิถีและวัฏจักรมีทิศทาง กราฟอวัฏจักรมีทิศทาง (Directed graphs: in-degree, out-degree, directed path/cycle, DAG)",
          "กราฟถ่วงน้ำหนัก และกราฟที่มีป้ายกำกับหรือสีบนปม/เส้นเชื่อม (Weighted and 'decorated' graphs with labels, weights, colors)",
          "ต้นไม้ทอดข้าม (Spanning trees)",
          "วิธีการเดินผ่านต้นไม้และการกำหนดลำดับปม (Tree traversal strategies and node ordering)",
          "กราฟสองส่วน (Bipartite graphs)",
          "กราฟหลายเส้นเชื่อม และกราฟที่มีเส้นเชื่อมวนตัวเอง (Multigraphs and graphs with self-loops)",
          "กราฟเชิงระนาบ (Planar graphs)",
          "ไฮเพอร์กราฟ (Hypergraphs)",
        ],
      },
    ],
    intro:
      "โครงสร้างทางคณิตศาสตร์ที่เป็นรากฐานของการนิยามปัญหาเชิงคำนวณ ผู้เข้าแข่งขันควรใช้โครงสร้างเหล่านี้ในการอธิบายและจัดรูปปัญหาได้",
    n: 2,
    th: "โครงสร้างไม่ต่อเนื่องและทฤษฎีกราฟ",
  },
  {
    en: "Programming Fundamentals and Data Structures",
    groups: [
      {
        heading: "3.1 พื้นฐานภาษาโปรแกรม (Programming Language Fundamentals)",
        items: [
          "ตัวแปร ค่าคงที่ และชนิดข้อมูลดั้งเดิม (ตรรกะ จำนวนเต็มมีเครื่องหมายและไม่มีเครื่องหมาย อักขระ) (Variables, constants and primitive data types, Boolean, signed/unsigned integer, character)",
          "ขอบเขตค่าของชนิดข้อมูล และการล้นของจำนวนเต็ม (Data type ranges and integer overflow)",
          "ตัวดำเนินการ ลำดับความสำคัญ และการแปลงชนิดข้อมูล (Operators, precedence and type conversion)",
          "โครงสร้างควบคุมแบบเลือกทำและแบบวนซ้ำ (Selection and iteration control structures)",
          "ฟังก์ชัน การส่งค่าโดยค่าและโดยการอ้างอิง และขอบเขตของตัวแปร (Functions, pass by value/reference and variable scope)",
          "การรับข้อมูลเข้าและแสดงผลมาตรฐาน (Standard input and output)",
          "พอยน์เตอร์และการอ้างอิง (Pointers and references)",
          "การจัดสรรหน่วยความจำแบบสถิต แบบกองซ้อน และแบบพลวัต (Static, stack and dynamic memory allocation)",
          "การเร่งความเร็วการรับและส่งข้อมูล (Fast I/O techniques)",
          "การอ่านและตีความข้อความแจ้งข้อผิดพลาดของคอมไพเลอร์ (Reading and interpreting compiler diagnostics)",
        ],
      },
      {
        heading: "3.2 โครงสร้างข้อมูลพื้นฐาน (Basic Data Structures)",
        items: [
          "แถวลำดับหนึ่งมิติและหลายมิติ (One-dimensional and multi-dimensional arrays)",
          "ระเบียนและโครงสร้าง (Record and struct)",
          "สตริงและการดำเนินการกับสตริง (Strings and string operations)",
          "โครงสร้างเชื่อมโยง ทั้งแบบเชิงเส้นและแบบแตกสาขา (Linked structures, both linear and branching)",
          "กองซ้อน คิว และคิวสองปลาย (Stack, queue and deque)",
          "คิวลำดับความสำคัญ และฮีปทวิภาค (Priority queue and binary heap)",
          "ต้นไม้ค้นหาแบบทวิภาค (Binary search tree)",
          "ตารางแฮช (Hash table)",
          "เซตเชิงพลวัตและแมปเชิงพลวัต (Dynamic set and dynamic map)",
          "การสร้างและใช้งานโครงสร้างต้นไม้และกราฟ (Constructing and using tree and graph structures)",
          "การเลือกโครงสร้างข้อมูลที่เหมาะสมกับปัญหา (Selecting appropriate data structures)",
        ],
      },
      {
        heading: "3.3 ไลบรารีมาตรฐานของภาษา C++ (C++ Standard Library (STL))",
        items: [
          "vector, string, pair, tuple, array (vector, string, pair, tuple, array)",
          "sort, stable_sort, reverse, unique, lower_bound, upper_bound, min_element, max_element, next_permutation (Standard algorithms)",
          "set, multiset, map, multimap, unordered_set, unordered_map (Associative containers)",
          "stack, queue, deque, priority_queue (Container adaptors)",
          "ตัวเปรียบเทียบที่กำหนดเอง และนิพจน์แลมบ์ดา (Custom comparators and lambda expressions)",
          "bitset (bitset)",
          "ไลบรารีมาตรฐานของภาษา C ที่เทียบเท่า สำหรับผู้ใช้ภาษา C (Equivalent C standard library facilities for C programmers)",
        ],
      },
      {
        heading: "3.4 โครงสร้างข้อมูลระดับกลาง (Intermediate Data Structures)",
        items: [
          "ผลรวมนำหน้าหนึ่งมิติและสองมิติ และแถวลำดับผลต่าง (Prefix sum (1D/2D) and difference array)",
          "การบีบอัดพิกัด (Coordinate compression)",
          "โครงสร้างข้อมูลหาผู้แทนเซต พร้อมการบีบอัดเส้นทางและการรวมตามอันดับ (Disjoint Set Union (Union-Find) with path compression and union by rank)",
          "ต้นไม้เฟนวิก (Fenwick tree, Binary Indexed Tree)",
          "เซกเมนต์ทรี แบบปรับค่าจุดเดียวและสอบถามเป็นช่วง (Segment tree with point update and range query)",
          "ทรี สำหรับจัดเก็บสตริงหรือคำนำหน้า (Trie, prefix tree)",
        ],
      },
      {
        heading: "3.5 การเรียกซ้ำ (Recursion)",
        items: [
          "แนวคิดการเรียกซ้ำ กรณีฐาน และกรณีย่อย (Concept of recursion, base case and subproblems)",
          "ฟังก์ชันทางคณิตศาสตร์ที่เรียกตัวเองซ้ำ (Mathematical functions defined recursively)",
          "วิธีแบ่งแยกและเอาชนะ (Divide and conquer)",
          "การย้อนรอยแบบเรียกตัวเองซ้ำ (Recursive backtracking)",
          "การจำผลลัพธ์ (Memoization)",
          "ความลึกของการเรียกซ้ำและข้อจำกัดของกองซ้อน (Recursion depth and stack limits)",
        ],
      },
    ],
    intro:
      "ทักษะการเขียนโปรแกรมด้วยภาษา C หรือ C++ และการเลือกใช้โครงสร้างข้อมูลให้เหมาะกับปัญหา เป็นหมวดที่ผู้เข้าแข่งขันทุกคนต้องมีความรู้ครบถ้วนในระดับ L1 และ L2",
    n: 3,
    th: "พื้นฐานการเขียนโปรแกรมและโครงสร้างข้อมูล",
  },
  {
    en: "Algorithms and Complexity Analysis",
    groups: [
      {
        heading: "4.1 การวิเคราะห์ความซับซ้อน (Complexity Analysis)",
        items: [
          "สัญกรณ์โอใหญ่ และการประมาณอัตราการเติบโต (Big-O notation and growth rates)",
          "ความซับซ้อนด้านเวลาและด้านหน่วยความจำ (Time and space complexity)",
          "การประมาณอัลกอริทึมที่เหมาะสมจากขอบเขตของข้อมูลเข้า (Choosing an algorithm from input constraints)",
          "ความซับซ้อนเฉลี่ยเชิงกลุ่ม (Amortized complexity)",
        ],
      },
      {
        heading: "4.2 กลวิธีทางอัลกอริทึม (Algorithmic Strategies)",
        items: [
          "การค้นหาแบบละเอียดถี่ถ้วน (Brute force and complete search)",
          "การจำลองสถานการณ์ตามกฎที่โจทย์กำหนด (Simulation)",
          "การตัดกิ่งเพื่อลดปริภูมิการค้นหา (Pruning the search space)",
          "การย้อนรอย ทั้งแบบเรียกตัวเองซ้ำและไม่เรียกตัวเองซ้ำ (Backtracking, both recursive and non-recursive)",
          "อัลกอริทึมแบบละโมบ และการให้เหตุผลยืนยันความถูกต้อง (Greedy algorithms and correctness arguments)",
          "วิธีแบ่งแยกและเอาชนะ (Divide and conquer)",
          "เทคนิคสองตัวชี้ และหน้าต่างเลื่อน (Two pointers and sliding window)",
          "การค้นหาแบบทวิภาคบนคำตอบ (Binary search on the answer, parametric search)",
        ],
      },
      {
        heading: "4.3 การเรียงลำดับและการค้นหา (Sorting and Searching)",
        items: [
          "การค้นหาแบบลำดับ (Sequential search)",
          "การค้นหาแบบทวิภาค (Binary search)",
          "การเรียงลำดับพื้นฐานที่มีความซับซ้อน O(N²) (Elementary O(N²) sorting)",
          "การจัดการแถวลำดับขั้นพื้นฐาน (Basic array manipulation)",
          "การค้นหาโดยการตัดทิ้ง (Search by elimination)",
          "การแบ่งข้อมูล และการจัดลำดับด้วยการแบ่งข้อมูลซ้ำ (Partitioning and quick sort)",
          "การเรียงลำดับที่มีเวลาแย่ที่สุดเป็น O(N log N) เช่น การเรียงแบบผสาน และการเรียงด้วยฮีป (Sorting with O(N log N) worst case: merge sort, heap sort)",
          "การเรียงลำดับตามหลายเกณฑ์ (Sorting with multiple keys)",
          "การเรียงลำดับแบบนับ และการเรียงลำดับตามหลัก (Counting sort and radix sort)",
        ],
      },
      {
        heading: "4.4 การโปรแกรมแบบพลวัต (Dynamic Programming)",
        items: [
          "แนวคิด การนิยามสถานะ การเปลี่ยนสถานะ และลำดับการคำนวณ (Concept, state definition, transitions and evaluation order)",
          "การโปรแกรมแบบพลวัตหนึ่งมิติ (One-dimensional DP)",
          "การโปรแกรมแบบพลวัตสองมิติ และบนตารางกริด (Two-dimensional and grid DP)",
          "ปัญหาเป้สะพายหลัง ทั้งแบบ 0/1 และแบบไม่จำกัดจำนวน (Knapsack problems, 0/1 and unbounded)",
          "ลำดับย่อยเพิ่มที่ยาวสุด ลำดับย่อยร่วมที่ยาวสุด และระยะแก้ไข (LIS, LCS and edit distance)",
          "การโปรแกรมแบบพลวัตบนช่วง (Interval DP)",
          "การโปรแกรมแบบพลวัตบนต้นไม้ (DP on trees)",
          "การโปรแกรมแบบพลวัตด้วยบิตมาสก์ สำหรับ n ไม่เกิน 20 (Bitmask DP for n ≤ 20)",
          "การโปรแกรมแบบพลวัตบนสถานะของเกม (DP on game states)",
        ],
      },
      {
        heading: "4.5 อัลกอริทึมบนกราฟ (Graph Algorithms)",
        items: [
          "การเดินผ่านกราฟแบบลึกก่อน และแบบกว้างก่อน (Depth-first and breadth-first traversal)",
          "การเติมสีแบบน้ำท่วม (Flood fill)",
          "การหาองค์ประกอบที่เชื่อมต่อกันของกราฟไม่มีทิศทาง (Connected components of undirected graphs)",
          "การตรวจหาวัฏจักรในกราฟมีทิศทางและไม่มีทิศทาง (Cycle detection)",
          "การเรียงลำดับเชิงโทโพโลยี (Topological sort)",
          "วิถีสั้นสุดบนกราฟไม่ถ่วงน้ำหนัก และการค้นหาแบบกว้างก่อนบนน้ำหนัก 0-1 (Shortest path on unweighted graphs and 0-1 BFS)",
          "อัลกอริทึมของไดค์สตรา (Dijkstra's algorithm)",
          "อัลกอริทึมเบลล์แมน ฟอร์ด และการตรวจวัฏจักรน้ำหนักลบ (Bellman-Ford algorithm and negative cycle detection)",
          "อัลกอริทึมฟลอยด์ วอร์แชล และการหาความสัมพันธ์ปิดเชิงถ่ายทอด (Floyd-Warshall algorithm and transitive closure)",
          "ต้นไม้ทอดข้ามน้อยสุด ด้วยอัลกอริทึมของครุสกาลและพริม (Minimum spanning tree: Kruskal's and Prim's algorithms)",
          "วิถีสั้นสุดและยาวสุดบนกราฟอวัฏจักรมีทิศทาง ด้วยการโปรแกรมแบบพลวัต (Shortest/longest path on DAG via DP)",
        ],
      },
    ],
    intro:
      "ครอบคลุมกลวิธีการออกแบบอัลกอริทึม อัลกอริทึมมาตรฐาน และความสามารถในการวิเคราะห์ว่าวิธีที่เลือกทำงานได้ทันภายในขอบเขตที่โจทย์กำหนด",
    n: 4,
    th: "อัลกอริทึมและการวิเคราะห์ความซับซ้อน",
  },
  {
    en: "String and Data Processing",
    groups: [
      {
        heading: "5.1 การจัดการสตริง (String Manipulation)",
        items: [
          "การอ่านและเขียนสตริง ทั้งแบบคำและแบบทั้งบรรทัด (Reading and writing strings by token and by line)",
          "ความยาว การตัด การต่อ และการเปรียบเทียบสตริง (Length, substring, concatenation and comparison)",
          "การแปลงตัวพิมพ์ และการตรวจชนิดของอักขระ (Case conversion and character classification)",
          "การนับความถี่ของอักขระและคำ (Character and word frequency counting)",
          "การเรียงสตริงตามลำดับพจนานุกรม (Lexicographic ordering of strings)",
          "การตรวจสอบพาลินโดรม และการสลับอักษร (Palindrome and anagram detection)",
          "การแยกวิเคราะห์ข้อความตามรูปแบบที่กำหนด (Tokenizing and parsing formatted text)",
          "การจับคู่รูปแบบแบบตรงไปตรงมา (Naive pattern matching)",
          "การแฮชสตริงแบบต่อเนื่อง (Rolling hash)",
          "อัลกอริทึมเคเอ็มพี และฟังก์ชันแซด (KMP algorithm and Z-function)",
          "การประยุกต์ใช้ทรีกับปัญหาสตริง (Applying tries to string problems)",
        ],
      },
      {
        heading: "5.2 การประมวลผลและจัดการข้อมูล (Data Processing and Handling)",
        items: [
          "รูปแบบข้อมูลเข้าและข้อมูลออก และการตรวจสอบความถูกต้องของข้อมูล (Input/output formats and data validation)",
          "การจัดรูปแบบผลลัพธ์ ความละเอียดทศนิยม และการจัดวางข้อความ (Output formatting, precision and alignment)",
          "แนวคิดวิทยาการข้อมูลเบื้องต้น การรวบรวม สำรวจ และนำเสนอข้อมูล (Basic data science concepts: collecting, exploring and presenting data)",
          "ตารางข้อมูล การจัดกลุ่ม และการสรุปค่า (Tabular data, grouping and aggregation)",
          "การจัดการวันที่ เวลา และหน่วยวัด (Handling dates, times and units)",
          "การเรียงและจัดอันดับข้อมูลตามหลายเกณฑ์ (Ranking data by multiple criteria)",
          "การตรวจหาและขจัดข้อมูลซ้ำ (Duplicate detection and deduplication)",
          "การสอบถามข้อมูลเป็นช่วงบนข้อมูลที่ไม่เปลี่ยนแปลง (Range queries on static data)",
        ],
      },
    ],
    intro:
      "ทักษะการจัดการข้อความและข้อมูลเชิงตาราง ซึ่งเป็นงานที่พบมากที่สุดในการเขียนโปรแกรมใช้งานจริง และสอดคล้องกับสาระวิทยาการข้อมูลตามหลักสูตรแกนกลาง",
    n: 5,
    th: "การประมวลผลสตริงและข้อมูล",
  },
  {
    en: "Computational Thinking and Problem Modelling",
    groups: [
      {
        heading: "6.1 แนวคิดเชิงคำนวณ (Computational Thinking)",
        items: [
          "การแยกส่วนประกอบและการย่อยปัญหา (Decomposition)",
          "การหารูปแบบและความคล้ายของปัญหา (Pattern recognition)",
          "การคิดเชิงนามธรรม และการตัดรายละเอียดที่ไม่จำเป็น (Abstraction)",
          "การออกแบบขั้นตอนวิธี (Algorithm design)",
          "การเขียนรหัสลำลองและผังงาน (Pseudocode and flowcharts)",
        ],
      },
      {
        heading: "6.2 การสร้างแบบจำลองปัญหา (Problem Modelling)",
        items: [
          "การแปลงปัญหาเชิงบรรยายเป็นแบบจำลองทางคณิตศาสตร์หรือกราฟ (Translating narrative problems into mathematical or graph models)",
          "การจำลองสถานการณ์ตามกฎที่กำหนด (Rule-based simulation)",
          "โจทย์เชิงสร้างคำตอบ (Constructive problems)",
          "ค่าคงที่เชิงตรรกะ และปริมาณที่เปลี่ยนทางเดียว (Invariants and monovariants)",
          "ทฤษฎีเกมเบื้องต้น สถานะแพ้หรือชนะ และเกมนิมอย่างง่าย (Basic game theory: win/lose states and simple Nim)",
        ],
      },
      {
        heading: "6.3 การประมาณและการตัดสินใจเชิงวิศวกรรม (Estimation and Engineering Judgement)",
        items: [
          "การประมาณขนาดปัญหาและเลือกวิธีแก้จากขอบเขตของ ข้อมูลเข้า (Estimating problem size and selecting an approach from constraints)",
          "การประเมินความคุ้มค่าระหว่างเวลาและหน่วยความจำ (Time-space trade-off analysis)",
          "อัลกอริทึมเชิงประมาณและฮิวริสติกสำหรับปัญหาหา ค่าเหมาะที่สุด (Approximation and heuristic algorithms for optimization problems)",
        ],
      },
      {
        heading: "6.4 การทดสอบและการแก้จุดบกพร่อง (Testing and Debugging)",
        items: [
          "การวิเคราะห์กรณีขอบและกรณีพิเศษ (Edge case and special case analysis)",
          "การสร้างชุดข้อมูลทดสอบด้วยตนเอง (Constructing test cases manually)",
          "การแก้จุดบกพร่องอย่างเป็นระบบ (Systematic debugging)",
          "การทดสอบเชิงเปรียบเทียบกับวิธีแบบละเอียดถี่ถ้วน (Stress testing against a brute-force solution)",
          "การใช้การยืนยันเงื่อนไขระหว่างทำงาน (Using assertions)",
          "การประมาณเวลาทำงานจากการทดลอง (Empirical runtime measurement)",
        ],
      },
    ],
    intro:
      "สมรรถนะที่สอดคล้องโดยตรงกับมาตรฐาน ว 4.2 ของหลักสูตรแกนกลาง เป็นหมวดที่วัดความสามารถในการคิดแก้ปัญหาโดยไม่ต้องอาศัยความรู้อัลกอริทึมที่มีชื่อเฉพาะ",
    n: 6,
    th: "การคิดเชิงคำนวณและการสร้างแบบจำลองปัญหา",
  },
];
