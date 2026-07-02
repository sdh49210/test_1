import React, { useState } from "react";
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
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- 타입 정의 (TypeScript Types) ---
type AppStep = "select" | "arrange";

export default function App() {
  // --- 상태 관리 (State Management) ---
  const [step, setStep] = useState<AppStep>("select"); // 현재 화면 단계 ('select': 인원 선택, 'arrange': 자리 배치)
  const [studentCount, setStudentCount] = useState<number>(10); // 선택된 학생 수 (기본값: 10명, 범위: 1~20)
  const [excludedSeats, setExcludedSeats] = useState<number[]>([]); // 'X' 지정된 자리번호 리스트 (1~20)
  const [assignedSeats, setAssignedSeats] = useState<{ [seatId: number]: string } | null>(null); // 배정 결과 (자리번호 -> 학생이름 또는 상태)
  const [isShuffling, setIsShuffling] = useState<boolean>(false); // 자리 섞기 애니메이션 진행 여부
  const [alertMessage, setAlertMessage] = useState<string | null>(null); // 경고 메시지 토스트 상태

  // --- 도움말 상태 (Help Toggle) ---
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // --- 상수 정의 ---
  const TOTAL_SEATS = 20; // 4행 * 5열 = 총 20자리
  const ROWS = 4;
  const COLS = 5;

  // --- 유틸리티 함수: 임시 토스트 경고 알림 표시 ---
  const triggerAlert = (msg: string) => {
    setAlertMessage(msg);
    setTimeout(() => {
      setAlertMessage(null);
    }, 3000);
  };

  // --- 1단계: 학생 수 결정 후 자리 배치 단계로 진입 ---
  const handleStart = () => {
    setStep("arrange");
    setExcludedSeats([]); // 초기화 시 제외 자리는 비워둠
    setAssignedSeats(null); // 배정 상태 초기화 (대기 상태)
  };

  // --- 빈자리 'X' 토글 기능 ---
  const handleSeatClick = (seatId: number) => {
    // 만약 애니메이션 중이면 클릭 방지
    if (isShuffling) return;

    // 이미 X로 지정되어 있는 경우 -> 제외 해제
    if (excludedSeats.includes(seatId)) {
      setExcludedSeats(prev => prev.filter(id => id !== seatId));
      
      // 만약 이미 배정이 완료된 상태에서 자리를 변경하면 배정 대기 상태로 되돌림 (사용자 혼란 방지)
      if (assignedSeats) {
        setAssignedSeats(null);
        triggerAlert("자리가 변경되어 배정 대기 상태로 전환되었습니다. 다시 배정해주세요!");
      }
    } else {
      // 새로 X로 지정하는 경우
      // 제한 조건: 남은 배정 가능한 자리가 학생 수보다 많거나 같아야 함
      // 즉, 제외하는 자리 개수는 최대 (20 - 학생수)개까지만 가능
      const maxExcluded = TOTAL_SEATS - studentCount;
      if (excludedSeats.length >= maxExcluded) {
        triggerAlert(
          `학생 수(${studentCount}명)를 배치하기 위해 최소 ${studentCount}개의 자리가 필요합니다! (최대 제외 가능 자리: ${maxExcluded}개)`
        );
        return;
      }

      setExcludedSeats(prev => [...prev, seatId]);

      // 이미 배정이 완료된 상태에서 자리를 변경하면 배정 대기 상태로 전환
      if (assignedSeats) {
        setAssignedSeats(null);
        triggerAlert("자리가 변경되어 배정 대기 상태로 전환되었습니다. 다시 배정해주세요!");
      }
    }
  };

  // --- 무작위 자리 배정 로직 (자리 바꾸기 핵심) ---
  const handleAssign = () => {
    if (isShuffling) return;

    setIsShuffling(true);

    // 0.6초간 카드 섞는 애니메이션 효과 연출
    setTimeout(() => {
      // 1부터 20까지의 전체 자리 배열
      const allSeats = Array.from({ length: TOTAL_SEATS }, (_, i) => i + 1);

      // 'X' 처리된 자리를 제외한 실제 배정 가능 자리 필터링
      const availableSeats = allSeats.filter(id => !excludedSeats.includes(id));

      // 학생 명단 자동 생성 (학생 1, 학생 2, ..., 학생 N)
      const students = Array.from({ length: studentCount }, (_, i) => `학생 ${i + 1}`);

      // 피셔-예이츠(Fisher-Yates) 셔플 알고리즘으로 배정 가능한 자리를 무작위로 섞음
      const shuffledSeats = [...availableSeats];
      for (let i = shuffledSeats.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledSeats[i], shuffledSeats[j]] = [shuffledSeats[j], shuffledSeats[i]];
      }

      // 배정 결과 맵 객체 생성
      const newAssignments: { [key: number]: string } = {};

      // 1. 제외된 자리는 "제외"로 세팅
      excludedSeats.forEach(id => {
        newAssignments[id] = "제외";
      });

      // 2. 학생들을 섞인 자리에 순서대로 배치
      students.forEach((student, index) => {
        if (index < shuffledSeats.length) {
          const seatId = shuffledSeats[index];
          newAssignments[seatId] = student;
        }
      });

      // 3. 학생 수보다 자리가 남아서 배정받지 못한 유효 자리는 자동으로 '빈자리' 처리
      if (shuffledSeats.length > students.length) {
        const remainingSeats = shuffledSeats.slice(students.length);
        remainingSeats.forEach(seatId => {
          newAssignments[seatId] = "빈자리";
        });
      }

      setAssignedSeats(newAssignments);
      setIsShuffling(false);
    }, 600);
  };

  // --- 모든 설정 초기화 및 첫 화면으로 이동 ---
  const handleResetAll = () => {
    setStep("select");
    setExcludedSeats([]);
    setAssignedSeats(null);
  };

  // --- 제외(X) 자리 모두 초기화 ---
  const handleClearExclusions = () => {
    if (isShuffling) return;
    setExcludedSeats([]);
    if (assignedSeats) {
      setAssignedSeats(null);
      triggerAlert("제외 자리가 초기화되어 배정 대기 상태로 전환되었습니다.");
    } else {
      triggerAlert("모든 제외 자리가 해제되었습니다.");
    }
  };

  // --- 화면 인쇄 기능 ---
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col justify-between">
      <div>
        {/* --- 상단 심플 네비게이션 / 헤더 --- */}
        <header className="bg-white border-b-3 border-slate-900 px-6 sm:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-xs print:hidden">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-indigo-600 font-display">
              SEAT SHUFFLER <span className="text-slate-400 font-light">PRO</span>
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-0.5">교실 자리 바꾸기 프로그램 v1.0</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            {step === "arrange" && (
              <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border-2 border-slate-200">
                <div className="px-3 py-1 text-center">
                  <p className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold">Students</p>
                  <p className="text-sm font-black text-slate-800">{studentCount}명</p>
                </div>
                <div className="w-px h-6 bg-slate-300"></div>
                <div className="px-3 py-1 text-center">
                  <p className="text-[9px] uppercase tracking-widest text-rose-400 font-extrabold">Blocked (X)</p>
                  <p className="text-sm font-black text-rose-500">{excludedSeats.length}석</p>
                </div>
                <div className="w-px h-6 bg-slate-300"></div>
                <div className="px-3 py-1 text-center">
                  <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-extrabold">Available</p>
                  <p className="text-sm font-black text-emerald-600">{TOTAL_SEATS - excludedSeats.length}석</p>
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
        <main className="max-w-6xl mx-auto px-4 py-8 flex-grow">
          <AnimatePresence mode="wait">
            {/* ==================== [1단계: 인원수 선택 화면] ==================== */}
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
                    <h2 className="text-3xl font-black tracking-tight font-display">인원 선택하기</h2>
                    <p className="text-indigo-100 text-xs mt-2 opacity-90 leading-relaxed font-semibold uppercase tracking-wider">
                      복잡한 이름 리스트를 직접 입력할 필요가 없는 단순 버젼
                    </p>
                  </div>

                  {/* 입력 및 설정 폼 */}
                  <div className="p-8 space-y-6 bg-white">
                    <div>
                      <label htmlFor="student-count-select" className="block text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                        배정할 학생 수 (최대 20명)
                      </label>
                      <div className="relative">
                        <select
                          id="student-count-select"
                          value={studentCount}
                          onChange={(e) => setStudentCount(Number(e.target.value))}
                          className="w-full bg-slate-50 border-2 border-slate-900 text-slate-900 rounded-2xl px-4 py-3.5 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 font-extrabold text-xl appearance-none transition cursor-pointer shadow-sm"
                        >
                          {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                            <option key={num} value={num}>
                              {num}명 배치
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
                        <span>💡 안내 사항:</span>
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>교실 구조는 항상 <strong>4행 × 5열 (총 20자리)</strong>입니다.</li>
                        <li>학생 이름은 자동으로 <strong>학생1, 학생2, 학생3...</strong>으로 생성됩니다.</li>
                        <li>배정 시작 전, 원하는 칸을 눌러 <strong>X (빈자리) 지정</strong>을 수동으로 선택할 수 있습니다.</li>
                      </ul>
                    </div>

                    {/* 시작 버튼 */}
                    <button
                      onClick={handleStart}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-150 flex items-center justify-center space-x-2 text-lg transform active:scale-95 cursor-pointer"
                    >
                      <span>교실 배치도 보기</span>
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
                {/* 왼쪽: 컨트롤 패널 (교사 조작 영역) */}
                <div className="lg:col-span-4 space-y-6 print:hidden">
                  <div className="bg-white rounded-3xl border-3 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] p-6 space-y-6">
                    {/* 뒤로 가기 / 제목 */}
                    <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
                      <button
                        onClick={handleResetAll}
                        className="flex items-center space-x-1 text-xs font-black text-slate-500 hover:text-slate-900 transition px-2.5 py-1.5 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer active:scale-95"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>인원 다시 설정</span>
                      </button>
                      <span className="text-xs bg-indigo-600 text-white font-black px-3 py-1 rounded-full border-2 border-slate-900 uppercase tracking-wider font-mono">
                        {studentCount}명 배정중
                      </span>
                    </div>

                    {/* 통계 카드 (실시간 정보 표시) */}
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center space-x-1.5">
                        <span>📊 LIVE STATISTICS</span>
                      </h3>
                      <div className="grid grid-cols-3 gap-2.5">
                        {/* 학생 수 */}
                        <div className="bg-slate-100 border-2 border-slate-900 rounded-2xl p-3 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">학생 수</p>
                          <p className="text-xl font-black text-slate-900 mt-1">{studentCount}명</p>
                        </div>
                        {/* 제외된 자리 (X) */}
                        <div className="bg-rose-50 border-2 border-slate-900 rounded-2xl p-3 text-center">
                          <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">제외 (X)</p>
                          <p className="text-xl font-black text-rose-600 mt-1">{excludedSeats.length}개</p>
                        </div>
                        {/* 배정 가능 자리 */}
                        <div className="bg-emerald-50 border-2 border-slate-900 rounded-2xl p-3 text-center">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">배정 가능</p>
                          <p className="text-xl font-black text-emerald-700 mt-1">{TOTAL_SEATS - excludedSeats.length}석</p>
                        </div>
                      </div>
                    </div>

                    {/* 안내 배너 */}
                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 text-xs leading-relaxed text-indigo-900 space-y-1.5 font-medium">
                      <p className="font-extrabold flex items-center space-x-1 text-indigo-950">
                        <span className="text-indigo-600">💡</span>
                        <span>사용 가이드:</span>
                      </p>
                      <p>
                        자리 배정을 시작하기 전, 오른쪽 배치도에서 비워두고 싶은 자리를 마우스로 클릭하여 <strong className="text-rose-600">X 표시(빈자리)</strong>로 직접 지정하세요.
                      </p>
                      <p className="text-slate-500 text-[11px] mt-2">
                        * 최소 {studentCount}개의 자리가 필요하므로 최대 제외 가능 자리는 {TOTAL_SEATS - studentCount}개입니다.
                      </p>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="space-y-3 pt-2">
                      {/* 자리 배정 / 다시 자리 배정 */}
                      <button
                        onClick={handleAssign}
                        disabled={isShuffling}
                        className={`w-full text-white font-black py-4 rounded-2xl border-2 border-slate-900 transition-all duration-150 flex items-center justify-center space-x-2 text-lg cursor-pointer transform active:scale-95 ${
                          assignedSeats 
                            ? "bg-slate-900 hover:bg-slate-950 shadow-[4px_4px_0px_0px_rgba(79,70,229,0.3)]" 
                            : "bg-indigo-600 hover:bg-indigo-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
                        }`}
                      >
                        {isShuffling ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent mr-1"></div>
                            <span>SHUFFLING...</span>
                          </>
                        ) : assignedSeats ? (
                          <>
                            <Shuffle className="w-5 h-5" />
                            <span>다시 자리 배정 (섞기)</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            <span>자리 배정하기</span>
                          </>
                        )}
                      </button>

                      {/* 설정 초기화 버튼 (X 표시 해제) */}
                      {excludedSeats.length > 0 && (
                        <button
                          onClick={handleClearExclusions}
                          disabled={isShuffling}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-2.5 rounded-xl text-xs transition-colors border-2 border-slate-300 flex items-center justify-center space-x-1 cursor-pointer active:scale-95"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>모든 제외 자리 해제 (X 취소)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 하단 개발 철학 및 추가 정보 */}
                  <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 text-xs text-slate-500 space-y-2">
                    <p className="font-extrabold text-slate-800">🔒 보안 및 데이터 보호 정책:</p>
                    <p className="leading-relaxed">
                      이 프로그램은 별도의 데이터베이스(DB), 쿠키, 로컬스토리지(LocalStorage)를 일체 사용하지 않는 <strong>순수 인메모리 임시 도구</strong>입니다. 웹브라우저 창을 새로고침하면 모든 정보가 즉각 안전하게 폐기됩니다.
                    </p>
                  </div>
                </div>

                {/* 오른쪽: 교실 배치도 영역 (전체 4x5 격자판) */}
                <div className="lg:col-span-8 flex flex-col space-y-4">
                  {/* 칠판 / 교탁 방향 표시 (선생님 및 학생들의 시각적 기준선) */}
                  <div className="bg-slate-900 rounded-2xl py-3 px-6 text-center text-white shadow-md relative overflow-hidden border-2 border-slate-900">
                    <p className="text-sm font-black tracking-widest flex items-center justify-center space-x-2 font-display">
                      <span className="text-xs bg-indigo-500 px-2 py-0.5 rounded-md text-white font-mono uppercase">FRONT</span>
                      <span className="text-slate-100 uppercase">앞 / 교탁 (칠판) 방향</span>
                    </p>
                  </div>

                  {/* 현재 상태 정보 요약 헤더 (모바일 및 인쇄 시 유용) */}
                  <div className="flex justify-between items-center px-2 py-1 print:flex hidden">
                    <h2 className="text-xl font-black text-slate-900 font-display uppercase">SEAT ARRANGEMENT MAP</h2>
                    <div className="text-xs text-slate-700 font-extrabold space-x-3">
                      <span>배정 학생 수: <strong>{studentCount}명</strong></span>
                      <span>제외 지정석: <strong>{excludedSeats.length}개</strong></span>
                    </div>
                  </div>

                  {/* 격자판 콘텐트 */}
                  <div className="bg-slate-200/60 rounded-3xl p-5 sm:p-6 border-3 border-slate-900 shadow-inner relative min-h-[500px] flex flex-col justify-between">
                    <div className="grid grid-cols-5 gap-3 sm:gap-4 md:gap-4">
                      {Array.from({ length: TOTAL_SEATS }, (_, index) => {
                        const seatId = index + 1;
                        const isExcluded = excludedSeats.includes(seatId);
                        const assignment = assignedSeats ? assignedSeats[seatId] : null;

                        // 카드 스타일 정의 (Bold Typography 스타일에 맞춘 굵직한 테두리와 극단적 대비 효과 적용)
                        let cardBgClass = "bg-white border-slate-200 hover:border-indigo-400";
                        let borderStyle = "border-2 sm:border-3";
                        let textColorClass = "text-slate-900";

                        if (isExcluded) {
                          // 제외된 자리 (X) 스타일
                          cardBgClass = "bg-rose-50 border-rose-400 border-dashed hover:bg-rose-100/60";
                          textColorClass = "text-rose-600";
                        } else if (assignment === "빈자리") {
                          // 할당 남는 바람에 생긴 자동 빈자리 스타일
                          cardBgClass = "bg-slate-50 border-slate-300 border-dashed opacity-80";
                          textColorClass = "text-slate-400";
                        } else if (assignment) {
                          // 학생 배치 완료 카드 스타일 (Stark border, Bold text)
                          cardBgClass = "bg-white border-indigo-600 ring-2 ring-indigo-600/10 shadow-sm";
                          textColorClass = "text-indigo-950";
                        } else {
                          // 배치 대기 상태 스타일
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
                            {/* 자리 번호 표식 */}
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md border border-slate-900 font-mono ${
                                isExcluded 
                                  ? "bg-rose-500 text-white" 
                                  : assignment && assignment !== "빈자리"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-900 text-white"
                              }`}>
                                {seatId}
                              </span>
                              
                              {/* 우측 상단 상태 마커 */}
                              {isExcluded && (
                                <span className="text-[10px] font-extrabold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Blocked</span>
                              )}
                              {!isExcluded && !assignment && (
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                              )}
                              {!isExcluded && assignment && assignment !== "빈자리" && (
                                <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest font-mono">STU</span>
                              )}
                            </div>

                            {/* 카드 중앙 텍스트 (학생이름 / 상태) */}
                            <div className="my-auto py-1 text-center">
                              {isExcluded ? (
                                <span className="text-xl sm:text-2xl font-black text-rose-500 tracking-wider">X</span>
                              ) : assignment === "빈자리" ? (
                                <span className="text-xs sm:text-sm font-extrabold text-slate-400">빈자리</span>
                              ) : assignment ? (
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ type: "spring", stiffness: 180, damping: 15 }}
                                  className="text-center"
                                >
                                  <p className="text-[8px] sm:text-[9px] text-indigo-600 font-extrabold uppercase tracking-widest mb-0.5 font-mono">Student</p>
                                  <span className="text-base sm:text-lg md:text-xl font-black tracking-tight block text-slate-900">
                                    {assignment}
                                  </span>
                                </motion.div>
                              ) : (
                                <span className="text-[10px] sm:text-xs text-slate-400 font-extrabold uppercase tracking-widest font-mono">EMPTY</span>
                              )}
                            </div>

                            {/* 하단 꾸밈 요소 */}
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
                        <span>배정 대기</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-3.5 h-3.5 rounded-md border-2 border-slate-900 bg-rose-50 inline-block"></span>
                        <span>X 제외 자리</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-3.5 h-3.5 rounded-md border-2 border-slate-900 bg-white ring-2 ring-indigo-600/10 inline-block"></span>
                        <span>배치 완료</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-3.5 h-3.5 rounded-md border-2 border-slate-900 bg-slate-50 border-dashed inline-block"></span>
                        <span>남는 빈자리</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* --- 하단 푸터 정보 --- */}
      <footer className="px-8 py-5 bg-slate-900 text-slate-400 text-[10px] font-bold tracking-widest uppercase border-t-3 border-slate-950 flex flex-col sm:flex-row justify-between items-center gap-2 mt-12 shrink-0">
        <div>Layout: 4 Rows × 5 Columns (Standard Classroom)</div>
        <div>© 2026 SEAT SHUFFLER PRO • IN-MEMORY PROTO</div>
      </footer>

      {/* --- 도움말 모달 (과하지 않고 정교한 다이얼로그) --- */}
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
                <span>💡 SEAT SHUFFLER 도움말</span>
              </h3>
              
              <div className="space-y-4 text-sm text-slate-700 leading-relaxed overflow-y-auto max-h-[60vh] pr-1">
                <p>
                  이 프로그램은 전국의 초등학교, 중학교, 고등학교 선생님들이 학급 자리를 바꿀 때 쉽고 유용하게 사용할 수 있도록 제작되었습니다.
                </p>
                <div className="space-y-2">
                  <p className="font-extrabold text-slate-900 uppercase tracking-wide">✅ 주요 사용 흐름:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>첫 화면에서 <strong>학생 수(1~20명)</strong>를 설정하고 [자리 배치 시작하기]를 클릭합니다.</li>
                    <li>교실 4×5 격자 배치도에서 키 큰 학생이 앉아야 하거나 컴퓨터 연결 등으로 <strong>제외하고 싶은 자리</strong>를 클릭해 <strong>X</strong>로 설정합니다.</li>
                    <li>X로 지정되지 않은 나머지 칸들 중에서 학생들이 <strong>무작위</strong>로 배정됩니다.</li>
                    <li>자리 배정 버튼을 누르면 즉시 애니메이션 효과와 함께 자리가 배치됩니다.</li>
                    <li>배치 결과가 맘에 들지 않으면 <strong>[다시 자리 배정]</strong>을 눌러 학생 명단 및 X 설정은 그대로 둔 채 자리만 다시 섞을 수 있습니다.</li>
                  </ol>
                </div>
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1 mt-2 font-medium">
                  <p className="font-bold flex items-center space-x-1 text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>주의 사항</span>
                  </p>
                  <p>
                    이 프로그램은 로컬 웹브라우저 메모리 안에서만 동작하므로 페이지를 새로고침하면 설정 정보가 모두 초기화됩니다. 안전하게 보관하고 싶으실 경우 <strong>[인쇄]</strong> 기능을 사용해 결과를 보관하거나 PDF로 저장해 주시기 바랍니다.
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
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <span>{alertMessage}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
