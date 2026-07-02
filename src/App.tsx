import React, { useState, useEffect } from "react";
import { 
  Users, 
  Shuffle, 
  RotateCcw, 
  UserX, 
  Grid, 
  HelpCircle, 
  ArrowLeft, 
  Printer, 
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Info,
  Trash2,
  Plus,
  Save,
  Download,
  Lock,
  Unlock,
  ToggleLeft,
  ToggleRight,
  Database
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ============================================================================
// 🔥 [FIREBASE FIRESTORE 설정 영역]
// ============================================================================
// Firebase를 처음 사용하는 사람도 쉽게 이해할 수 있도록 구성한 상세 연동부입니다.
// 이 설정값은 플랫폼에서 안전하게 프로비저닝된 Cloud Firestore 인스턴스를 가리킵니다.
// ============================================================================
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD4txlPW12tUBb-i8QfFwelIQ6p6B7Xwvs",
  authDomain: "gen-lang-client-0035243160.firebaseapp.com",
  projectId: "gen-lang-client-0035243160",
  storageBucket: "gen-lang-client-0035243160.firebasestorage.app",
  messagingSenderId: "494040967000",
  appId: "1:494040967000:web:6fcfbcd63e4187afdc272d"
};

// 1. Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 2. Cloud Firestore 데이터베이스 객체 획득 (프로젝트 전용 맞춤 데이터베이스 ID 사용)
const db = getFirestore(app, "ai-studio-304cd32d-1444-4e47-bb13-590bae731bac");

// --- 타입 정의 ---
type AppStep = "select" | "arrange";
type InteractionMode = "exclude" | "fix";

export default function App() {
  // --- 상태 관리 (State Management) ---
  const [step, setStep] = useState<AppStep>("select"); // 현재 화면 단계
  const [students, setStudents] = useState<string[]>([]); // 학생 이름 명단 (예: ["학생 1", "학생 2", ...])
  const [excludedSeats, setExcludedSeats] = useState<number[]>([]); // 제외(X) 자리번호 리스트 (1~20)
  const [fixedSeats, setFixedSeats] = useState<{ [seatId: number]: string }>({}); // 고정석 매핑 (자리번호 -> 학생이름)
  const [assignedSeats, setAssignedSeats] = useState<{ [seatId: number]: string } | null>(null); // 현재 배정된 자리 결과 map
  
  // --- 상태 제어 옵션 ---
  const [interactMode, setInteractMode] = useState<InteractionMode>("exclude"); // "exclude": 빈자리 X 지정 모드, "fix": 고정석 지정 모드
  const [selectedSeatForFix, setSelectedSeatForFix] = useState<number | null>(null); // 고정석 설정을 위해 클릭한 자리 번호
  const [activeTab, setActiveTab] = useState<"seats" | "students">("seats"); // 왼쪽 사이드바 제어 탭 ("seats": 자리배정, "students": 명단관리)
  
  // --- 애니메이션 & 알림 상태 ---
  const [isShuffling, setIsShuffling] = useState<boolean>(false); // 셔플 애니메이션 상태
  const [isSaving, setIsSaving] = useState<boolean>(false); // 저장 진행 상태
  const [isLoading, setIsLoading] = useState<boolean>(true); // 초기 DB 로딩 상태
  const [alertMessage, setAlertMessage] = useState<string | null>(null); // 알림 토스트 내용
  const [alertType, setAlertType] = useState<"success" | "error" | "info" | "warning">("info"); // 알림 종류

  // --- 도움말 토글 ---
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // --- 상수 정의 ---
  const TOTAL_SEATS = 20; // 4행 * 5열 = 총 20자리
  const ROWS = 4;
  const COLS = 5;

  // --- 실시간 알림 토스트 유틸리티 ---
  const triggerAlert = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setAlertMessage(msg);
    setAlertType(type);
    setTimeout(() => {
      setAlertMessage(null);
    }, 3200);
  };

  // ============================================================================
  // 📥 [FIREBASE FIRESTORE 데이터 로드]
  // 어플리케이션이 시작될 때 Firestore로부터 기존 데이터를 자동으로 불러옵니다.
  // ============================================================================
  useEffect(() => {
    async function initFetch() {
      try {
        setIsLoading(true);
        // 'classroom' 콜렉션의 'main' 문서 참조
        const docRef = doc(db, "classroom", "main");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // 데이터베이스에 저장된 값 복원
          if (data.students) setStudents(data.students);
          if (data.excludedSeats) setExcludedSeats(data.excludedSeats);
          if (data.fixedSeats) {
            // Firestore는 Map 키를 문자열로만 저장하므로 숫자로 변환하여 복원합니다.
            const rawFixed = data.fixedSeats;
            const convertedFixed: { [key: number]: string } = {};
            Object.keys(rawFixed).forEach(key => {
              convertedFixed[Number(key)] = rawFixed[key];
            });
            setFixedSeats(convertedFixed);
          }
          if (data.assignedSeats) {
            const rawAssigned = data.assignedSeats;
            const convertedAssigned: { [key: number]: string } = {};
            Object.keys(rawAssigned).forEach(key => {
              convertedAssigned[Number(key)] = rawAssigned[key];
            });
            setAssignedSeats(convertedAssigned);
          }

          // 만약 이전에 로딩된 이력이 있다면 바로 자리배치 화면으로 도달할 수 있게 유도
          if (data.students && data.students.length > 0) {
            setStep("arrange");
          }
          
          triggerAlert("데이터베이스에서 학급 정보를 성공적으로 불러왔습니다!", "success");
        } else {
          // 데이터가 아예 없는 최초 상태의 경우 기본값 10명 세팅
          const defaultStudents = Array.from({ length: 10 }, (_, i) => `학생 ${i + 1}`);
          setStudents(defaultStudents);
          triggerAlert("저장된 이전 정보가 없어 신규 명단(10명)을 준비했습니다.", "info");
        }
      } catch (err: any) {
        console.error("Firestore 로딩 에러:", err);
        triggerAlert("데이터를 불러오는 중 오류가 발생했습니다: " + err.message, "error");
      } finally {
        setIsLoading(false);
      }
    }
    initFetch();
  }, []);

  // ============================================================================
  // 💾 [학생 명단 저장 (Firestore)]
  // ============================================================================
  const saveStudentsToDB = async () => {
    try {
      setIsSaving(true);
      const docRef = doc(db, "classroom", "main");
      
      // 현재 문서 상태를 가져와서 덮어씌움
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};

      await setDoc(docRef, {
        ...existingData,
        students: students
      });

      triggerAlert("학생 명단이 데이터베이스에 안전하게 저장되었습니다!", "success");
    } catch (err: any) {
      console.error("학생 명단 저장 중 오류:", err);
      triggerAlert("명단 저장에 실패했습니다: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // 💾 [자리 배치 및 고정석 상태 저장 (Firestore)]
  // ============================================================================
  const saveLayoutToDB = async () => {
    try {
      setIsSaving(true);
      const docRef = doc(db, "classroom", "main");

      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};

      // Firestore 저장용으로 고정석/배정석의 숫자 키를 문자열로 안전하게 전환
      const stringifiedFixed: { [key: string]: string } = {};
      Object.keys(fixedSeats).forEach(key => {
        stringifiedFixed[key] = fixedSeats[Number(key)];
      });

      const stringifiedAssigned: { [key: string]: string } = {};
      if (assignedSeats) {
        Object.keys(assignedSeats).forEach(key => {
          stringifiedAssigned[key] = assignedSeats[Number(key)];
        });
      }

      await setDoc(docRef, {
        ...existingData,
        excludedSeats: excludedSeats,
        fixedSeats: stringifiedFixed,
        assignedSeats: assignedSeats ? stringifiedAssigned : null
      });

      triggerAlert("현재 자리배치, 제외석, 고정석 설정이 데이터베이스에 저장되었습니다!", "success");
    } catch (err: any) {
      console.error("자리배치 저장 중 오류:", err);
      triggerAlert("자리배치 저장에 실패했습니다: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // 📥 [저장된 자리 불러오기 (Firestore 수동 로드)]
  // ============================================================================
  const loadLayoutFromDB = async () => {
    try {
      setIsLoading(true);
      const docRef = doc(db, "classroom", "main");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.excludedSeats) setExcludedSeats(data.excludedSeats);
        
        if (data.fixedSeats) {
          const rawFixed = data.fixedSeats;
          const convertedFixed: { [key: number]: string } = {};
          Object.keys(rawFixed).forEach(key => {
            convertedFixed[Number(key)] = rawFixed[key];
          });
          setFixedSeats(convertedFixed);
        } else {
          setFixedSeats({});
        }

        if (data.assignedSeats) {
          const rawAssigned = data.assignedSeats;
          const convertedAssigned: { [key: number]: string } = {};
          Object.keys(rawAssigned).forEach(key => {
            convertedAssigned[Number(key)] = rawAssigned[key];
          });
          setAssignedSeats(convertedAssigned);
        } else {
          setAssignedSeats(null);
        }

        triggerAlert("저장되어 있던 자리 배치 기록을 복원했습니다!", "success");
      } else {
        triggerAlert("데이터베이스에 저장된 자리 배치 정보가 존재하지 않습니다.", "warning");
      }
    } catch (err: any) {
      console.error("명단 불러오기 오류:", err);
      triggerAlert("불러오기 실패: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 학생 수 드롭다운 변경 시 스마트 동기화 ---
  // 기존의 맞춤형 한글 이름들을 최대한 유지하며 인원을 조절합니다.
  const handleDropdownCountChange = (count: number) => {
    if (count === students.length) return;

    if (count > students.length) {
      // 인원 증가: 기존 명단은 그대로 두고 새로운 "학생 X" 들만 뒤에 추가
      const addedCount = count - students.length;
      const newNames = Array.from({ length: addedCount }, (_, i) => `학생 ${students.length + i + 1}`);
      setStudents(prev => [...prev, ...newNames]);
      triggerAlert(`인원이 ${count}명으로 늘어났습니다. 새 명단이 하단에 추가되었습니다.`, "info");
    } else {
      // 인원 감소: 뒷부분의 학생들을 잘라냄
      const confirmed = window.confirm(
        `인원수를 ${count}명으로 줄이면, 현재 명단의 뒤쪽 ${students.length - count}명의 학생 정보가 유실될 수 있습니다. 진행할까요?`
      );
      if (confirmed) {
        const truncated = students.slice(0, count);
        setStudents(truncated);
        
        // 유실된 학생에 매핑되어 있던 고정석은 안전하게 연쇄적으로 해제 처리
        const cleanFixed = { ...fixedSeats };
        let fixedCleaned = false;
        Object.keys(cleanFixed).forEach(key => {
          const seatId = Number(key);
          const assignedStudent = cleanFixed[seatId];
          if (!truncated.includes(assignedStudent)) {
            delete cleanFixed[seatId];
            fixedCleaned = true;
          }
        });
        if (fixedCleaned) {
          setFixedSeats(cleanFixed);
        }

        // 현재 배치도도 초기화하여 꼬임 방지
        setAssignedSeats(null);
        triggerAlert("인원 감소로 인해 배치도가 대기 상태로 재설정되었습니다.", "warning");
      }
    }
  };

  // --- 학생 추가 (개별) ---
  const handleAddStudent = () => {
    if (students.length >= TOTAL_SEATS) {
      triggerAlert(`최대 배치 가능한 학생 수(${TOTAL_SEATS}명)에 도달하여 추가할 수 없습니다!`, "warning");
      return;
    }
    const nextNumber = students.length + 1;
    setStudents(prev => [...prev, `학생 ${nextNumber}`]);
    triggerAlert("새 학생이 명단 끝에 추가되었습니다. 더블클릭이나 인풋을 수정하여 이름을 변경하세요.", "success");
  };

  // --- 학생 삭제 (개별) ---
  const handleRemoveStudent = (index: number) => {
    if (students.length <= 1) {
      triggerAlert("학급에는 최소 1명 이상의 학생이 있어야 합니다.", "warning");
      return;
    }
    const studentName = students[index];
    const updated = students.filter((_, i) => i !== index);
    setStudents(updated);

    // 고정석 목록에서 삭제된 학생 정보 제거
    const updatedFixed = { ...fixedSeats };
    let clearedFixed = false;
    Object.keys(updatedFixed).forEach(key => {
      const seatId = Number(key);
      if (updatedFixed[seatId] === studentName) {
        delete updatedFixed[seatId];
        clearedFixed = true;
      }
    });
    if (clearedFixed) {
      setFixedSeats(updatedFixed);
    }

    setAssignedSeats(null); // 무결성 유지를 위해 현재 임시 배치 초기화
    triggerAlert(`'${studentName}' 학생이 제거되었습니다. 안전한 배치를 위해 새 자리 배정이 필요합니다.`, "info");
  };

  // --- 학생 이름 수정 ---
  const handleStudentNameChange = (index: number, newName: string) => {
    const oldName = students[index];
    if (oldName === newName) return;

    const updated = [...students];
    updated[index] = newName;
    setStudents(updated);

    // 고정석에 등록된 이름도 동기화하여 연쇄 꼬임 방지
    const updatedFixed = { ...fixedSeats };
    Object.keys(updatedFixed).forEach(key => {
      const seatId = Number(key);
      if (updatedFixed[seatId] === oldName) {
        updatedFixed[seatId] = newName;
      }
    });
    setFixedSeats(updatedFixed);

    // 실시간 배치된 상태에서도 이름 즉시 리네임
    if (assignedSeats) {
      const updatedAssigned = { ...assignedSeats };
      Object.keys(updatedAssigned).forEach(key => {
        const seatId = Number(key);
        if (updatedAssigned[seatId] === oldName) {
          updatedAssigned[seatId] = newName;
        }
      });
      setAssignedSeats(updatedAssigned);
    }
  };

  // --- 자리 격자 클릭 제어 ---
  const handleSeatClick = (seatId: number) => {
    if (isShuffling) return;

    if (interactMode === "exclude") {
      // 1. 빈자리 'X' 지정 모드인 경우
      if (excludedSeats.includes(seatId)) {
        // 이미 X이면 해제
        setExcludedSeats(prev => prev.filter(id => id !== seatId));
        if (assignedSeats) {
          setAssignedSeats(null);
          triggerAlert("자리 설정이 변경되어 배정 대기 상태로 되돌아왔습니다.", "info");
        }
      } else {
        // 새롭게 X 지정하려는 경우
        // 고정석이 이미 설정되어 있는지 체크하여 충돌 방지
        if (fixedSeats[seatId]) {
          triggerAlert(`이 자리는 이미 '${fixedSeats[seatId]}' 학생의 고정석입니다! 고정석을 먼저 해제해야 제외(X)할 수 있습니다.`, "warning");
          return;
        }

        // 최대 제외석 한도 점검 (학생 수 만큼의 빈자리는 남겨야 함)
        const maxExcluded = TOTAL_SEATS - students.length;
        if (excludedSeats.length >= maxExcluded) {
          triggerAlert(
            `학생 명단(${students.length}명)을 모두 배치하려면 최소 ${students.length}칸의 자리가 필요합니다. (최대 지정 불가: ${maxExcluded}개)`,
            "warning"
          );
          return;
        }

        setExcludedSeats(prev => [...prev, seatId]);
        if (assignedSeats) {
          setAssignedSeats(null);
          triggerAlert("자리 설정이 변경되어 배정 대기 상태로 되돌아왔습니다.", "info");
        }
      }
    } else {
      // 2. 고정석 지정 모드인 경우
      if (excludedSeats.includes(seatId)) {
        triggerAlert("제외(X)로 표시된 자리에는 고정석을 설정할 수 없습니다! 먼저 X를 해제해주세요.", "warning");
        return;
      }
      // 고정석 설정 창 띄우기
      setSelectedSeatForFix(seatId);
    }
  };

  // --- 특정 자리 고정석 지정 완료 함수 ---
  const handleAssignFixedSeat = (seatId: number, studentName: string | null) => {
    const updatedFixed = { ...fixedSeats };

    if (!studentName) {
      // 고정 해제인 경우
      delete updatedFixed[seatId];
      setFixedSeats(updatedFixed);
      setAssignedSeats(null);
      triggerAlert(`${seatId}번 자리의 고정석 설정이 해제되었습니다.`, "info");
    } else {
      // 특정 학생을 고정석으로 지정하는 경우
      // 이미 이 학생이 다른 자리에 고정되어 있다면, 이전 고정 내역을 제거 (중복 방지)
      Object.keys(updatedFixed).forEach(key => {
        const id = Number(key);
        if (updatedFixed[id] === studentName) {
          delete updatedFixed[id];
        }
      });

      updatedFixed[seatId] = studentName;
      setFixedSeats(updatedFixed);
      setAssignedSeats(null);
      triggerAlert(`'${studentName}' 학생이 ${seatId}번 자리에 성공적으로 고정되었습니다!`, "success");
    }

    setSelectedSeatForFix(null);
  };

  // --- 자리 배정 및 무작위 셔플 핵심 규칙 알고리즘 ---
  const handleAssign = () => {
    if (isShuffling) return;

    // --- 사전 벨리데이션 체크 ---
    // 1. 고정석 지정된 학생이 현재 실제 학생 명단에 존재하는지 한 번 더 확인 (혹시 수동 수정되거나 삭제되었을 상황)
    const validFixed: { [seatId: number]: string } = {};
    Object.keys(fixedSeats).forEach(key => {
      const seatId = Number(key);
      const sName = fixedSeats[seatId];
      if (students.includes(sName)) {
        validFixed[seatId] = sName;
      }
    });

    // 만약 불일치한 내역이 있어서 보정된 경우 상태 갱신
    if (Object.keys(validFixed).length !== Object.keys(fixedSeats).length) {
      setFixedSeats(validFixed);
    }

    // 2. 총 학생 수와 배치 가능 자리 수 점검
    const availableTotalCount = TOTAL_SEATS - excludedSeats.length;
    if (students.length > availableTotalCount) {
      triggerAlert(
        `배치할 학생은 ${students.length}명인데 배정 가능한 빈자리는 ${availableTotalCount}개뿐입니다. X 표시를 해제하여 확보해 주세요!`,
        "error"
      );
      return;
    }

    // 3. 고정석 수와 학생 수 관계 검증
    const fixedCount = Object.keys(validFixed).length;
    if (fixedCount > students.length) {
      triggerAlert("고정석 지정 개수가 현재 전체 학생 수보다 많습니다. 설정을 정리해주세요.", "error");
      return;
    }

    // --- 자리 섞기 시작 ---
    setIsShuffling(true);

    setTimeout(() => {
      // 1~20 전체 자리
      const allSeats = Array.from({ length: TOTAL_SEATS }, (_, i) => i + 1);

      // 고정석 제외, 차단석(X) 제외한 온전한 '무작위 배치 대상 자리' 추출
      const excludedSet = new Set(excludedSeats);
      const fixedSeatIds = Object.keys(validFixed).map(Number);
      const fixedSeatSet = new Set(fixedSeatIds);

      // 무작위로 배정될 수 있는 가용 자리들
      const freeSeats = allSeats.filter(id => !excludedSet.has(id) && !fixedSeatSet.has(id));

      // 고정석에 이미 안착한 학생 이름을 제외한 '무작위 셔플 대상 학생' 추출
      const fixedStudentNames = new Set(Object.values(validFixed));
      const floatingStudents = students.filter(name => !fixedStudentNames.has(name));

      // 가용 자유석을 무작위로 셔플 (피셔-예이츠 알고리즘)
      const shuffledFreeSeats = [...freeSeats];
      for (let i = shuffledFreeSeats.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledFreeSeats[i], shuffledFreeSeats[j]] = [shuffledFreeSeats[j], shuffledFreeSeats[i]];
      }

      // 최종 배치 맵 조립
      const newAssignments: { [key: number]: string } = {};

      // 1) 차단된(X) 좌석 표시
      excludedSeats.forEach(id => {
        newAssignments[id] = "제외";
      });

      // 2) 고정석 좌석 할당
      Object.keys(validFixed).forEach(key => {
        const seatId = Number(key);
        newAssignments[seatId] = validFixed[seatId];
      });

      // 3) 셔플 대상 학생들을 섞인 자유석에 순차적 배치
      floatingStudents.forEach((student, index) => {
        if (index < shuffledFreeSeats.length) {
          const seatId = shuffledFreeSeats[index];
          newAssignments[seatId] = student;
        }
      });

      // 4) 남는 자리는 자동으로 '빈자리'로 채움
      if (shuffledFreeSeats.length > floatingStudents.length) {
        const remainingSeats = shuffledFreeSeats.slice(floatingStudents.length);
        remainingSeats.forEach(seatId => {
          newAssignments[seatId] = "빈자리";
        });
      }

      setAssignedSeats(newAssignments);
      setIsShuffling(false);
      triggerAlert("자리가 공정하고 깨끗하게 재배정되었습니다!", "success");
    }, 600);
  };

  // --- 첫 인원 설정 단계로 이동 및 전체 로컬 초기화 ---
  const handleResetAll = () => {
    const confirmReset = window.confirm("프로그램의 로컬 배정 정보를 초기화하고 인원 선택 화면으로 돌아갈까요? (DB에 저장된 정보는 덮어쓰기 전까지 유지됩니다)");
    if (confirmReset) {
      setStep("select");
      setExcludedSeats([]);
      setFixedSeats({});
      setAssignedSeats(null);
    }
  };

  // --- 모든 제외석 및 고정석 로컬 초기화 ---
  const handleClearExclusions = () => {
    if (isShuffling) return;
    setExcludedSeats([]);
    setFixedSeats({});
    setAssignedSeats(null);
    triggerAlert("모든 빈자리(X) 지정과 고정석 세팅이 초기화되었습니다.", "info");
  };

  // --- 교실 입장 단계 시작 ---
  const handleStart = () => {
    setStep("arrange");
  };

  // --- 화면 인쇄 기능 ---
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-950 flex flex-col justify-between">
      <div>
        {/* --- 상단 메인 네비게이션 / 헤더 --- */}
        <header className="bg-white border-b-3 border-slate-900 px-6 sm:px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 shadow-xs print:hidden">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-md border border-slate-900 font-black tracking-wider uppercase font-mono">DB Cloud Version</span>
              {isSaving && (
                <span className="animate-pulse bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold">SAVING...</span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-indigo-600 font-display">
              SEAT SHUFFLER <span className="text-slate-900 font-light">CLOUD</span>
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-0.5 flex items-center justify-center md:justify-start gap-1">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span>실시간 Firebase Firestore 자동 동기화 & 맞춤형 명단 완벽 지원</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* 상단 통계 현황판 */}
            {step === "arrange" && (
              <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border-2 border-slate-200 text-xs font-bold">
                <div className="px-2 text-center">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400 font-black">명단 학생</p>
                  <p className="text-xs font-black text-slate-800">{students.length}명</p>
                </div>
                <div className="w-px h-5 bg-slate-300"></div>
                <div className="px-2 text-center">
                  <p className="text-[8px] uppercase tracking-wider text-rose-400 font-black">X 제외</p>
                  <p className="text-xs font-black text-rose-500">{excludedSeats.length}석</p>
                </div>
                <div className="w-px h-5 bg-slate-300"></div>
                <div className="px-2 text-center">
                  <p className="text-[8px] uppercase tracking-wider text-amber-400 font-black">🔒 고정</p>
                  <p className="text-xs font-black text-amber-600">{Object.keys(fixedSeats).length}석</p>
                </div>
                <div className="w-px h-5 bg-slate-300"></div>
                <div className="px-2 text-center">
                  <p className="text-[8px] uppercase tracking-wider text-emerald-400 font-black">가용 좌석</p>
                  <p className="text-xs font-black text-emerald-600">{TOTAL_SEATS - excludedSeats.length}석</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex items-center space-x-1 text-xs font-black text-slate-600 hover:text-slate-900 transition px-3 py-2 rounded-xl bg-slate-100 border-2 border-slate-200 active:scale-95 cursor-pointer"
                title="도움말 보기"
              >
                <HelpCircle className="w-4 h-4" />
                <span>HELP</span>
              </button>
              {step === "arrange" && (
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-1 text-xs font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-400 transition px-3 py-2 rounded-xl active:scale-95 cursor-pointer"
                  title="인쇄하기"
                >
                  <Printer className="w-4 h-4" />
                  <span>PRINT</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* --- 메인 콘텐츠 공간 --- */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Firebase 클라우드 연동 상태 로딩 중...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* ==================== [1단계: 인원수 최초 설정 선택 화면] ==================== */}
              {step === "select" && (
                <motion.div
                  key="select-step"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-md mx-auto my-12"
                >
                  <div className="bg-white rounded-3xl border-3 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
                    {/* 상단 장식 배너 */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-center text-white border-b-3 border-slate-900">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="inline-block bg-white/10 p-3 rounded-2xl mb-3 backdrop-blur-xs"
                      >
                        <Users className="w-10 h-10 text-white" />
                      </motion.div>
                      <h2 className="text-3xl font-black tracking-tight font-display">학생 인원수 선택</h2>
                      <p className="text-indigo-100 text-xs mt-2 opacity-95 leading-relaxed font-semibold uppercase tracking-wider">
                        기본 학생 인원수를 정하고 시작합니다. (최대 20명)
                      </p>
                    </div>

                    {/* 입력 및 설정 폼 */}
                    <div className="p-8 space-y-6 bg-white">
                      <div>
                        <label htmlFor="student-count-select" className="block text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                          초기 학생 명단 수
                        </label>
                        <div className="relative">
                          <select
                            id="student-count-select"
                            value={students.length || 10}
                            onChange={(e) => {
                              const targetVal = Number(e.target.value);
                              // 기존 목록 사이즈 재조정
                              const currentLen = students.length;
                              if (targetVal > currentLen) {
                                const newNames = Array.from({ length: targetVal - currentLen }, (_, i) => `학생 ${currentLen + i + 1}`);
                                setStudents([...students, ...newNames]);
                              } else {
                                setStudents(students.slice(0, targetVal));
                              }
                            }}
                            className="w-full bg-slate-50 border-2 border-slate-900 text-slate-900 rounded-2xl px-4 py-3.5 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 font-extrabold text-xl appearance-none transition cursor-pointer shadow-sm"
                          >
                            {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                              <option key={num} value={num}>
                                {num}명 생성
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-900">
                            <Users className="w-5 h-5 text-slate-900" />
                          </div>
                        </div>
                      </div>

                      {/* 안내 설명 */}
                      <div className="bg-slate-100 rounded-2xl p-4 border-2 border-slate-200 space-y-2 text-xs text-slate-600 leading-relaxed font-medium">
                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-indigo-600" />
                          <span>💡 클라우드 핵심 기능:</span>
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>이름 수정, 학생 개별 추가/삭제가 완벽히 연동됩니다.</li>
                          <li>원하는 학생을 원하는 자리에 영구 <strong>고정(🔒)</strong>할 수 있습니다.</li>
                          <li>모든 명단, 고정석, 제외석 정보는 클라우드(Firestore)에 안전하게 저장됩니다.</li>
                        </ul>
                      </div>

                      {/* 시작 버튼 */}
                      <button
                        onClick={handleStart}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-150 flex items-center justify-center space-x-2 text-lg transform active:scale-95 cursor-pointer"
                      >
                        <span>교실 입장 및 자리 바꾸기</span>
                        <Sparkles className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ==================== [2단계: 자리 배치 및 빈자리 지정 메인 화면] ==================== */}
              {step === "arrange" && (
                <motion.div
                  key="arrange-step"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-4"
                >
                  {/* 왼쪽: 컨트롤 패널 (명단 관리 & 환경 설정 탭) */}
                  <div className="lg:col-span-4 space-y-6 print:hidden">
                    <div className="bg-white rounded-3xl border-3 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
                      {/* 탭 헤더 선택 영역 */}
                      <div className="flex border-b-3 border-slate-900 bg-slate-100">
                        <button
                          onClick={() => setActiveTab("seats")}
                          className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            activeTab === "seats" 
                              ? "bg-white text-indigo-600 border-r-3 border-slate-900" 
                              : "text-slate-500 hover:text-slate-900 border-r-3 border-slate-900"
                          }`}
                        >
                          🪑 자리 배치
                        </button>
                        <button
                          onClick={() => setActiveTab("students")}
                          className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            activeTab === "students" 
                              ? "bg-white text-indigo-600" 
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          👥 학생 명단 ({students.length})
                        </button>
                      </div>

                      {/* 탭 바디 영역 */}
                      <div className="p-5 space-y-5">
                        
                        {/* ============= [탭 1: 자리 배치 제어] ============= */}
                        {activeTab === "seats" && (
                          <div className="space-y-4">
                            {/* 마우스 동작 모드 스위치 */}
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">좌석 클릭 액션 모드</p>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => setInteractMode("exclude")}
                                  className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer transition-all ${
                                    interactMode === "exclude"
                                      ? "bg-rose-50 border-rose-500 text-rose-700 shadow-xs"
                                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
                                  }`}
                                >
                                  <UserX className="w-4 h-4" />
                                  <span>빈자리 (X) 지정</span>
                                </button>

                                <button
                                  onClick={() => setInteractMode("fix")}
                                  className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer transition-all ${
                                    interactMode === "fix"
                                      ? "bg-amber-50 border-amber-500 text-amber-700 shadow-xs"
                                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
                                  }`}
                                >
                                  <Lock className="w-4 h-4" />
                                  <span>고정석 지정</span>
                                </button>
                              </div>
                            </div>

                            {/* 사용 팁 안내 박스 */}
                            <div className="bg-indigo-50 border-2 border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-900 space-y-1.5 font-medium leading-relaxed">
                              {interactMode === "exclude" ? (
                                <>
                                  <p className="font-extrabold text-indigo-950 flex items-center gap-1">
                                    <span className="text-indigo-600">📌</span>
                                    <span>빈자리(X) 지정 모드 활성중</span>
                                  </p>
                                  <p>오른쪽 배치도에서 <strong>학생이 앉지 못하게 제외할 칸</strong>을 클릭하면 X 표시로 지정됩니다. (다시 누르면 해제)</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-extrabold text-indigo-950 flex items-center gap-1">
                                    <span className="text-amber-600">🔒</span>
                                    <span>고정석 지정 모드 활성중</span>
                                  </p>
                                  <p>오른쪽 배치도에서 원하는 칸을 누르면 <strong>특정 학생을 해당 자리에 고정</strong>해 둘 수 있습니다. (자리를 섞어도 이 학생은 고정 유지)</p>
                                </>
                              )}
                            </div>

                            {/* 핵심 무작위 배치 실행 버튼 */}
                            <button
                              onClick={handleAssign}
                              disabled={isShuffling}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all flex items-center justify-center space-x-2 text-base cursor-pointer"
                            >
                              {isShuffling ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent mr-1"></div>
                                  <span>자리를 공정하게 섞는 중...</span>
                                </>
                              ) : assignedSeats ? (
                                <>
                                  <Shuffle className="w-4 h-4" />
                                  <span>자리를 다시 배정하기</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  <span>무작위 자리 배치 시작</span>
                                </>
                              )}
                            </button>

                            {/* 💾 [데이터베이스 저장/불러오기 버튼 영역] */}
                            <div className="border-t-2 border-slate-100 pt-4 space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">데이터베이스 동기화 제어</p>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={saveLayoutToDB}
                                  disabled={isSaving}
                                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center space-x-1 cursor-pointer transition-all"
                                  title="현재 배치, 제외석 및 고정석 정보 모두 영구 저장"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>현재 자리 저장</span>
                                </button>

                                <button
                                  onClick={loadLayoutFromDB}
                                  className="py-3 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center space-x-1 cursor-pointer transition-all"
                                  title="DB에 기록된 최종 배치도를 즉각 복구"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>저장 자리 불러오기</span>
                                </button>
                              </div>
                            </div>

                            {/* 일괄 해제 */}
                            <div className="flex gap-2">
                              <button
                                onClick={handleResetAll}
                                className="flex-1 text-[11px] font-black text-slate-600 hover:text-slate-950 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-center transition border-2 border-slate-300"
                              >
                                인원 재설정
                              </button>
                              <button
                                onClick={handleClearExclusions}
                                className="flex-1 text-[11px] font-black text-slate-600 hover:text-slate-950 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-center transition border-2 border-slate-300"
                              >
                                모든 특수석 초기화
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ============= [탭 2: 학생 명단 관리] ============= */}
                        {activeTab === "students" && (
                          <div className="space-y-4">
                            
                            {/* 인원 조절 빠른 스위치 */}
                            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              <span className="text-xs font-extrabold text-slate-600">명단 인원수 맞춤</span>
                              <select
                                value={students.length}
                                onChange={(e) => handleDropdownCountChange(Number(e.target.value))}
                                className="bg-white border-2 border-slate-900 rounded-lg px-2 py-1 font-bold text-xs"
                              >
                                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                                  <option key={n} value={n}>{n}명</option>
                                ))}
                              </select>
                            </div>

                            {/* 명단 리스트 헤더 및 실시간 추가 */}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">학생 명단 편집</span>
                              <button
                                onClick={handleAddStudent}
                                className="flex items-center space-x-0.5 text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md border border-indigo-200 transition"
                              >
                                <Plus className="w-3 h-3" />
                                <span>개별 학생 추가</span>
                              </button>
                            </div>

                            {/* 스크롤 가능한 명단 구역 */}
                            <div className="max-h-[250px] overflow-y-auto pr-1 border-2 border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1.5 scrollbar-thin">
                              {students.map((student, idx) => {
                                // 현재 학생이 고정석으로 지정되어 있는지 여부 판단
                                const isFixedSomewhere = Object.values(fixedSeats).includes(student);
                                return (
                                  <div key={idx} className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all">
                                    <span className="text-[10px] font-mono font-black text-slate-400 w-5 text-center">{idx + 1}</span>
                                    
                                    <input
                                      type="text"
                                      value={student}
                                      onChange={(e) => handleStudentNameChange(idx, e.target.value)}
                                      className="flex-1 bg-transparent border-0 border-b border-transparent focus:border-indigo-500 focus:outline-hidden font-extrabold text-xs py-0.5 text-slate-800"
                                      placeholder="이름 입력"
                                    />

                                    {/* 고정 유무 표시 */}
                                    {isFixedSomewhere && (
                                      <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5" title="특정 자리에 고정되어 있는 학생입니다.">
                                        <Lock className="w-2.5 h-2.5 text-amber-700" />
                                        <span>고정</span>
                                      </span>
                                    )}

                                    <button
                                      onClick={() => handleRemoveStudent(idx)}
                                      className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-slate-50 transition"
                                      title="학생 삭제"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>

                            {/* 학생 명단 저장 (Amber/Orange 계열로 강조하여 구분하기 쉽게 연출) */}
                            <button
                              onClick={saveStudentsToDB}
                              disabled={isSaving}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-3.5 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center space-x-1.5 text-sm cursor-pointer"
                            >
                              <Save className="w-4 h-4" />
                              <span>명단 저장 (Cloud 백업)</span>
                            </button>

                          </div>
                        )}

                      </div>
                    </div>

                    {/* 데이터 상태 및 안내 정보 */}
                    <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 text-xs text-slate-500 space-y-2">
                      <p className="font-extrabold text-slate-800">📌 클라우드 자동 불러오기 보장:</p>
                      <p className="leading-relaxed text-[11px]">
                        교탁 주소나 도메인을 공유해 다른 모니터/교실 컴퓨터에서 띄워도 저장된 명단 및 고정석 정보가 완벽히 불러와집니다!
                      </p>
                    </div>
                  </div>

                  {/* 오른쪽: 교실 배치도 영역 (전체 4x5 격자판) */}
                  <div className="lg:col-span-8 flex flex-col space-y-4">
                    
                    {/* 칠판 / 교탁 방향 표시 */}
                    <div className="bg-slate-900 rounded-2xl py-3 px-6 text-center text-white shadow-md relative overflow-hidden border-2 border-slate-900">
                      <p className="text-sm font-black tracking-widest flex items-center justify-center space-x-2 font-display">
                        <span className="text-xs bg-indigo-500 px-2 py-0.5 rounded-md text-white font-mono uppercase">FRONT</span>
                        <span className="text-slate-100 uppercase">교실 앞 / 교탁 (칠판) 방향</span>
                      </p>
                    </div>

                    {/* 격자판 콘텐트 */}
                    <div className="bg-slate-200/60 rounded-3xl p-5 sm:p-6 border-3 border-slate-900 shadow-inner relative min-h-[500px] flex flex-col justify-between">
                      <div className="grid grid-cols-5 gap-3 sm:gap-4 md:gap-4">
                        {Array.from({ length: TOTAL_SEATS }, (_, index) => {
                          const seatId = index + 1;
                          const isExcluded = excludedSeats.includes(seatId);
                          const isFixed = !!fixedSeats[seatId];
                          const fixedStudentName = fixedSeats[seatId];
                          
                          // 배정 완료되었을 때 들어있어야 할 학생 이름
                          const assignment = assignedSeats ? assignedSeats[seatId] : null;

                          // 카드 스타일 정의 (Bold Typography 스타일에 맞춘 굵직한 테두리와 극단적 대비 효과 적용)
                          let cardBgClass = "bg-white border-slate-200 hover:border-indigo-400";
                          let borderStyle = "border-2 sm:border-3";
                          
                          if (isExcluded) {
                            cardBgClass = "bg-rose-50 border-rose-400 border-dashed hover:bg-rose-100/60";
                          } else if (isFixed) {
                            cardBgClass = "bg-amber-50 border-amber-500 shadow-sm";
                          } else if (assignment === "빈자리") {
                            cardBgClass = "bg-slate-50 border-slate-300 border-dashed opacity-85";
                          } else if (assignment) {
                            cardBgClass = "bg-white border-indigo-600 ring-2 ring-indigo-600/10 shadow-sm";
                          } else {
                            cardBgClass = "bg-white/90 border-slate-300 hover:border-slate-900 hover:bg-slate-50 cursor-pointer";
                          }

                          return (
                            <motion.div
                              key={seatId}
                              onClick={() => handleSeatClick(seatId)}
                              whileHover={{ scale: isShuffling ? 1 : 1.03 }}
                              whileTap={{ scale: isShuffling ? 1 : 0.98 }}
                              className={`relative rounded-2xl p-2.5 sm:p-4 min-h-[105px] sm:min-h-[120px] flex flex-col justify-between transition-all duration-150 select-none cursor-pointer border-slate-900 ${borderStyle} ${cardBgClass}`}
                            >
                              {/* 자리 번호 표식 및 상태 핀 */}
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md border border-slate-900 font-mono ${
                                  isExcluded 
                                    ? "bg-rose-500 text-white" 
                                    : isFixed
                                    ? "bg-amber-500 text-white"
                                    : assignment && assignment !== "빈자리"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-900 text-white"
                                }`}>
                                  {seatId}
                                </span>
                                
                                {/* 우측 상단 상태 마커 */}
                                {isExcluded && (
                                  <span className="text-[8px] font-black text-rose-600 bg-rose-100 px-1 py-0.5 rounded-sm uppercase tracking-wider">제외</span>
                                )}
                                {isFixed && (
                                  <span className="text-[8px] font-black text-amber-700 bg-amber-100 px-1 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>고정</span>
                                  </span>
                                )}
                                {!isExcluded && !isFixed && !assignment && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                )}
                                {!isExcluded && !isFixed && assignment && assignment !== "빈자리" && (
                                  <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest font-mono">STU</span>
                                )}
                              </div>

                              {/* 카드 중앙 텍스트 (학생이름 / 상태) */}
                              <div className="my-auto py-1 text-center">
                                {isExcluded ? (
                                  <span className="text-xl sm:text-2xl font-black text-rose-500 tracking-wider">X</span>
                                ) : isFixed ? (
                                  <div className="text-center">
                                    <p className="text-[8px] text-amber-600 font-black uppercase tracking-widest mb-0.5 font-mono">FIXED</p>
                                    <span className="text-sm sm:text-base md:text-lg font-black tracking-tight block text-slate-900">
                                      {fixedStudentName}
                                    </span>
                                  </div>
                                ) : assignment === "빈자리" ? (
                                  <span className="text-xs sm:text-sm font-extrabold text-slate-400">빈자리</span>
                                ) : assignment ? (
                                  <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 180, damping: 15 }}
                                    className="text-center"
                                  >
                                    <p className="text-[8px] text-indigo-600 font-black uppercase tracking-widest mb-0.5 font-mono">STUDENT</p>
                                    <span className="text-sm sm:text-base md:text-lg font-black tracking-tight block text-slate-900">
                                      {assignment}
                                    </span>
                                  </motion.div>
                                ) : (
                                  <span className="text-[10px] sm:text-xs text-slate-400 font-extrabold uppercase tracking-widest font-mono">EMPTY</span>
                                )}
                              </div>

                              {/* 하단 행/열 인덱스 */}
                              <div className="text-[8px] text-right text-slate-400 font-extrabold tracking-wider font-mono uppercase">
                                R{Math.floor((seatId - 1) / COLS) + 1} - C{((seatId - 1) % COLS) + 1}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* 하단 범례 */}
                      <div className="mt-6 pt-4 border-t-2 border-slate-300 flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] font-bold tracking-widest uppercase text-slate-500 print:hidden">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-3.5 h-3.5 rounded-md border-2 border-slate-900 bg-white inline-block"></span>
                          <span>배정 대기 (공석)</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="w-3.5 h-3.5 rounded-md border-2 border-slate-900 bg-rose-50 inline-block"></span>
                          <span>X 제외 자리</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="w-3.5 h-3.5 rounded-md border-2 border-slate-900 bg-amber-50 inline-block"></span>
                          <span>🔒 고정석 지정</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="w-3.5 h-3.5 rounded-md border-2 border-slate-900 bg-white ring-2 ring-indigo-600/10 inline-block"></span>
                          <span>배치 완료</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* --- 하단 푸터 정보 --- */}
      <footer className="px-8 py-5 bg-slate-900 text-slate-400 text-[10px] font-bold tracking-widest uppercase border-t-3 border-slate-950 flex flex-col sm:flex-row justify-between items-center gap-2 mt-12 shrink-0">
        <div>Layout: 4 Rows × 5 Columns (Standard Classroom)</div>
        <div>© 2026 SEAT SHUFFLER CLOUD • FIREBASE COLLAB</div>
      </footer>

      {/* --- 고정석 설정을 위한 학생 선택 퀵 다이얼로그 모달 --- */}
      <AnimatePresence>
        {selectedSeatForFix !== null && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border-3 border-slate-900 max-w-sm w-full p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-display uppercase tracking-tight">🔒 고정석 학생 지정</h3>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">{selectedSeatForFix}번 자리에 항상 배치할 학생을 정하세요.</p>
                </div>
              </div>

              {/* 현재 고정 내역 설명 */}
              {fixedSeats[selectedSeatForFix] && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mb-4 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-extrabold text-amber-800">현재 고정된 학생:</span>
                    <strong className="text-slate-900 ml-1 font-black text-sm">{fixedSeats[selectedSeatForFix]}</strong>
                  </div>
                  <button
                    onClick={() => handleAssignFixedSeat(selectedSeatForFix, null)}
                    className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold px-2 py-1 rounded-lg text-[10px] transition cursor-pointer"
                  >
                    고정 해제
                  </button>
                </div>
              )}

              {/* 학생 선택 리스트 */}
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 border border-slate-200 p-2 rounded-xl bg-slate-50">
                <p className="text-[9px] font-black uppercase text-slate-400 px-1 mb-1">고정 가능한 학생 명단</p>
                {students.map((student, idx) => {
                  const isCurrentSeatOwner = fixedSeats[selectedSeatForFix] === student;
                  const isFixedElsewhere = Object.keys(fixedSeats).some(
                    k => Number(k) !== selectedSeatForFix && fixedSeats[Number(k)] === student
                  );

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAssignFixedSeat(selectedSeatForFix, student)}
                      disabled={isCurrentSeatOwner}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                        isCurrentSeatOwner
                          ? "bg-slate-200 border-slate-300 text-slate-500 cursor-not-allowed"
                          : "bg-white border-slate-200 hover:border-indigo-500 text-slate-800 hover:bg-indigo-50/50"
                      }`}
                    >
                      <span>{student}</span>
                      {isFixedElsewhere && (
                        <span className="text-[8px] bg-slate-100 border text-slate-400 font-medium px-1 rounded">다른 자리에 고정됨 (선택 시 이동)</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 pt-3 border-t-2 border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedSeatForFix(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-4 py-2 rounded-xl border-2 border-slate-300 text-xs transition cursor-pointer"
                >
                  취소
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- 도움말 모달 --- */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border-3 border-slate-900 max-w-lg w-full p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] relative"
            >
              <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center space-x-2 font-display uppercase tracking-tight">
                <span>💡 SEAT SHUFFLER CLOUD 사용 안내</span>
              </h3>
              
              <div className="space-y-4 text-sm text-slate-700 leading-relaxed overflow-y-auto max-h-[60vh] pr-1">
                <p>
                  이 프로그램은 Firebase Cloud DB를 탑재하여 다른 기기, 다른 교실에서도 동일한 학생 명단과 자리배치를 안전하게 연동할 수 있도록 설계되었습니다.
                </p>
                <div className="space-y-2">
                  <p className="font-extrabold text-slate-900 uppercase tracking-wide">🔥 주요 추가 기능 가이드:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>
                      <strong>맞춤형 명단 관리 및 수정</strong>: 왼쪽의 '학생 명단' 탭에서 학생 이름을 즉석에서 변경하거나 개별 추가, 삭제가 가능합니다. 완료 후 <strong>[명단 저장 (Cloud 백업)]</strong>을 누르면 DB에 안전하게 반영되어 새로고침 후에도 유지됩니다.
                    </li>
                    <li>
                      <strong>고정석(🔒) 지정 기능</strong>: 고정석 모드 버튼을 누르고 오른쪽 배치도의 원하는 빈 칸을 클릭하면, 특정 학생을 해당 위치에 영구 고정할 수 있습니다. 자리를 다시 섞어도 고정된 학생은 항상 그 자리에 유지됩니다.
                    </li>
                    <li>
                      <strong>클라우드 보관 및 복구</strong>: <strong>[현재 자리 저장]</strong>을 클릭하면 배치 상태 및 고정석 정보가 클라우드에 기억되며, <strong>[저장 자리 불러오기]</strong> 버튼을 누르면 이전에 저장한 배치도를 즉시 불러옵니다.
                    </li>
                  </ol>
                </div>
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1 mt-2 font-medium">
                  <p className="font-bold flex items-center space-x-1 text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>주의 사항</span>
                  </p>
                  <p>
                    이 버전은 Firestore 클라우드 기반으로 동작하므로 오프라인 상태이거나 네트워크 장애가 발생할 경우 데이터 읽기/쓰기가 지연될 수 있습니다. 정상 동작을 위해 인터넷 연결을 확인해 주시기 바랍니다.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-slate-200 text-right">
                <button
                  onClick={() => setShowHelp(false)}
                  className="bg-slate-900 hover:bg-slate-950 text-white font-extrabold px-6 py-2.5 rounded-xl border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(79,70,229,1)] transition cursor-pointer text-xs uppercase"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- 경고 알림 토스트 (알림 발생 시 아래에서 슬며시 나타남) --- */}
      <AnimatePresence>
        {alertMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm print:hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-slate-950 text-white px-4 py-3.5 rounded-2xl shadow-xl flex items-center space-x-2.5 text-xs sm:text-sm font-extrabold border-2 border-slate-900"
            >
              {alertType === "success" && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
              {alertType === "error" && <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />}
              {alertType === "info" && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
              {alertType === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
              <span>{alertMessage}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
