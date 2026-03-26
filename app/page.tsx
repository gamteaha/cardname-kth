"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

// Using Canvas to generate "images" (Data URLs) for each shape
// Using Canvas to generate fruit "images" (Data URLs)
const FRUIT_DEFS = [
  { name: "사과", color: "#ef4444", draw: (ctx: CanvasRenderingContext2D) => {
    // Apple
    ctx.beginPath(); ctx.arc(100, 110, 60, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#854d0e"; ctx.fillRect(95, 30, 10, 30); // Stem
    ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.ellipse(115, 45, 15, 8, -0.5, 0, Math.PI * 2); ctx.fill(); // Leaf
  }},
  { name: "바나나", color: "#facc15", draw: (ctx: CanvasRenderingContext2D) => {
    // Banana
    ctx.beginPath(); ctx.arc(140, 60, 100, 0.5 * Math.PI, 1.1 * Math.PI);
    ctx.lineWidth = 35; ctx.lineCap = "round"; ctx.strokeStyle = "#facc15"; ctx.stroke();
    ctx.lineWidth = 5; ctx.strokeStyle = "#854d0e"; ctx.beginPath(); ctx.moveTo(55, 125); ctx.lineTo(45, 135); ctx.stroke(); // Tip
  }},
  { name: "포도", color: "#a855f7", draw: (ctx: CanvasRenderingContext2D) => {
    // Grape cluster
    const pos = [[80,80], [120,80], [100,110], [140,110], [80,140], [120,140], [100,165]];
    pos.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "#854d0e"; ctx.fillRect(95, 30, 8, 30); // Stem
  }},
  { name: "오렌지", color: "#f97316", draw: (ctx: CanvasRenderingContext2D) => {
    // Orange
    ctx.beginPath(); ctx.arc(100, 105, 65, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ea580c"; ctx.beginPath(); ctx.arc(100, 105, 55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#854d0e"; ctx.beginPath(); ctx.arc(100, 45, 5, 0, Math.PI * 2); ctx.fill(); // Dimple
  }},
  { name: "수박", color: "#22c55e", draw: (ctx: CanvasRenderingContext2D) => {
    // Watermelon slice
    ctx.beginPath(); ctx.arc(100, 80, 80, 0, Math.PI, false); ctx.fill();
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(100, 80, 65, 0, Math.PI, false); ctx.fill();
    ctx.fillStyle = "#000"; // Seeds
    [[85,100], [115,100], [100,125], [75,120], [125,120]].forEach(([x,y]) => { ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); });
  }},
  { name: "딸기", color: "#f43f5e", draw: (ctx: CanvasRenderingContext2D) => {
    // Strawberry
    ctx.beginPath(); ctx.moveTo(100, 170); ctx.bezierCurveTo(30, 140, 30, 60, 100, 60); ctx.bezierCurveTo(170, 60, 170, 140, 100, 170); ctx.fill();
    ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.moveTo(100, 65); ctx.lineTo(60, 50); ctx.lineTo(100, 35); ctx.lineTo(140, 50); ctx.closePath(); ctx.fill(); // Top
    ctx.fillStyle = "#fff"; // Seeds
    [[80,90], [120,90], [100,110], [70,120], [130,120], [100,140]].forEach(([x,y]) => { ctx.beginPath(); ctx.arc(x,y,2,0,Math.PI*2); ctx.fill(); });
  }},
  { name: "블루베리", color: "#3b82f6", draw: (ctx: CanvasRenderingContext2D) => {
    // Blueberry
    ctx.beginPath(); ctx.arc(80, 110, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1d4ed8"; ctx.beginPath(); ctx.arc(130, 100, 42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e3a8a"; ctx.beginPath(); ctx.arc(80, 80, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(130, 70, 10, 0, Math.PI * 2); ctx.fill();
  }},
  { name: "복숭아", color: "#fb7185", draw: (ctx: CanvasRenderingContext2D) => {
    // Peach
    ctx.beginPath(); ctx.arc(75, 110, 55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(125, 110, 55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#854d0e"; ctx.fillRect(96, 35, 8, 25); // Stem
    ctx.fillStyle = "#f43f5e"; ctx.beginPath(); ctx.arc(100, 110, 10, 0, Math.PI, false); ctx.fill(); // Cleft bottom
  }},
];

interface Card {
  id: number;
  shapeIndex: number;
  isFlipped: boolean;
  isMatched: boolean;
}

interface RankEntry {
  name: string;
  finishTime: number;
}

export default function CardMatchGame() {
  const [gameStatus, setGameStatus] = useState<"start" | "playing" | "finished">("start");
  const [playerName, setPlayerName] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [firstCardIndex, setFirstCardIndex] = useState<number | null>(null);
  const [fails, setFails] = useState(0);
  const [matches, setMatches] = useState(0);
  const [time, setTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rankInfo, setRankInfo] = useState<{ rank: number; total: number } | null>(null);
  const [topPlayers, setTopPlayers] = useState<RankEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------
  // Google Spreadsheet Rank Logic
  // ---------------------------------------------------------
  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyMa9RDfzIklKJBgwJv-x2kNlA5FtJioqyQPHPDUtMr19smx4cxdq66luGzHgNrUCwiug/exec";

  const postResultAndGetRank = async (name: string, finishTime: number) => {
    setIsSaving(true);
    try {
      // 1. 결과 저장 (URL 쿼리 스트링 방식 - 시트 저장 성능이 가장 확실함)
      await fetch(`${WEB_APP_URL}?name=${encodeURIComponent(name)}&finishTime=${finishTime}`, {
        method: "POST",
        mode: "no-cors",
      });

      // 2. GET (순위 조회 - 데이터 정확성을 위해 1초 대기 후 조회 가능)
      setTimeout(async () => {
        try {
          const response = await fetch(`${WEB_APP_URL}?t=${Date.now()}`);
          const rawData = await response.json();
          const allResults: RankEntry[] = rawData;

          // 순위 계산 (시간 오름차순)
          const sorted = [...allResults].sort((a, b) => a.finishTime - b.finishTime);
          const currentRank = sorted.findIndex(r => r.name === name && Math.abs(r.finishTime - finishTime) < 0.1) + 1;


          setRankInfo({
            rank: currentRank > 0 ? currentRank : sorted.length,
            total: sorted.length
          });
          setTopPlayers(sorted.slice(0, 3));
          setIsSaving(false);
        } catch (e) {
          console.error("Rank fetch error:", e);
          setIsSaving(false);
        }
      }, 1000);

    } catch (error) {
      console.error("Save error:", error);
      setIsSaving(false);
    }
  };
  // ---------------------------------------------------------

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 200; canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const generated = FRUIT_DEFS.map((def: { draw: (ctx: CanvasRenderingContext2D) => void; color: string }) => {
      ctx.clearRect(0, 0, 200, 200);
      ctx.fillStyle = def.color;
      ctx.globalCompositeOperation = "source-over";
      def.draw(ctx);
      return canvas.toDataURL();
    });
    setImages(generated);
  }, []);

  const shuffleCards = useCallback(() => {
    const pairs = [...Array(8).keys(), ...Array(8).keys()];
    const shuffled = pairs
      .map((shapeIndex, i) => ({ id: i, shapeIndex, isFlipped: false, isMatched: false }))
      .sort(() => Math.random() - 0.5);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCards(shuffled);
  }, []);

  const startGame = () => {
    if (!playerName.trim()) return;
    setGameStatus("playing");
    setFails(0); setMatches(0); setTime(0); setRankInfo(null);
    shuffleCards();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  };

  const handleCardClick = (index: number) => {
    if (isProcessing || cards[index].isFlipped || cards[index].isMatched) return;
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);
    if (firstCardIndex === null) {
      setFirstCardIndex(index);
    } else {
      setIsProcessing(true);
      if (cards[firstCardIndex].shapeIndex === newCards[index].shapeIndex) {
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) => (i === index || i === firstCardIndex ? { ...c, isMatched: true } : c)));
          const currentMatches = matches + 1;
          setMatches(currentMatches);
          setFirstCardIndex(null); setIsProcessing(false);
          if (currentMatches === 8) {
            setGameStatus("finished");
            if (timerRef.current) clearInterval(timerRef.current);
            postResultAndGetRank(playerName, time);
          }
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) => (i === index || i === firstCardIndex ? { ...c, isFlipped: false } : c)));
          setFails((prev) => prev + 1);
          setFirstCardIndex(null); setIsProcessing(false);
        }, 1000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f9ff] text-[#556987] flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full">
        {gameStatus === "start" && (
          <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl space-y-10 text-center animate-in fade-in zoom-in duration-500">
            <div className="space-y-3">
              <div className="w-16 h-16 bg-orange-100 rounded-3xl mx-auto flex items-center justify-center text-3xl">🍎</div>
              <h1 className="text-4xl font-black text-orange-500 tracking-tight">과일 맞추기 게임</h1>
              <p className="text-sm font-medium opacity-50 uppercase tracking-widest text-orange-300">상큼한 과일 에디션</p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="이름을 입력하세요"
                className="w-full px-6 py-4 rounded-2xl bg-orange-50/50 border-2 border-transparent focus:border-orange-200 outline-none transition-all text-center font-bold text-orange-600 placeholder:text-orange-200"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <button
                disabled={!playerName.trim()}
                onClick={startGame}
                className="w-full py-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-30 text-white font-black text-xl rounded-2xl transition-all shadow-lg active:scale-95"
              >
                게임 시작하기
              </button>
            </div>
          </div>
        )}

        {gameStatus === "playing" && (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-sm flex justify-between items-center font-black text-orange-400 text-sm px-8">
              <div className="flex items-center gap-2">⏱️ {time}초</div>
              <div className="flex items-center gap-2">❌ 틀림: {fails}</div>
              <div className="flex items-center gap-2">🍎 {matches}/8</div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {cards.map((card, index) => (
                <div key={card.id} onClick={() => handleCardClick(index)} className="relative aspect-square cursor-pointer active:scale-90 transition-transform duration-200" style={{ perspective: "1000px" }}>
                  <div className="absolute inset-0 w-full h-full transition-transform duration-500 rounded-2xl shadow-sm" style={{ transformStyle: "preserve-3d", transform: card.isFlipped || card.isMatched ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                    <div className="absolute inset-0 w-full h-full bg-white rounded-2xl flex items-center justify-center p-4 border-2 border-white" style={{ backfaceVisibility: "hidden" }}>
                      <div className="w-full h-full bg-orange-50/50 rounded-xl border-4 border-dashed border-orange-100/30 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-orange-200/50"></div>
                      </div>
                    </div>
                    <div className={`absolute inset-0 w-full h-full rounded-2xl flex items-center justify-center bg-white ${card.isMatched ? "bg-orange-50/30 opacity-40 grayscale" : ""}`} style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                      {images[card.shapeIndex] && <img src={images[card.shapeIndex]} alt="shape" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <button onClick={() => setGameStatus("start")} className="text-xs font-bold text-orange-300 hover:text-orange-500">종료하기</button>
            </div>
          </div>
        )}

        {gameStatus === "finished" && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6 animate-in bounce-in duration-500 max-w-sm mx-auto">
            <div className="text-5xl">🍒</div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-orange-500">게임 완료!</h2>
              {isSaving ? (
                <p className="text-orange-300 text-sm font-bold animate-pulse italic">순위 집계 중...</p>
              ) : rankInfo ? (
                <div className="py-2">
                   <p className="text-orange-400 font-black text-4xl">{rankInfo.rank}등</p>
                   <p className="text-[10px] text-orange-200 font-bold uppercase tracking-widest">전체 {rankInfo.total}명 중</p>
                </div>
              ) : (
                <p className="text-orange-300 font-bold">{playerName}님, 완료!</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50/50 p-4 rounded-3xl border border-orange-100/50">
                <div className="text-[9px] font-black text-orange-300 uppercase tracking-wider mb-1">내 기록</div>
                <div className="text-2xl font-black text-orange-500">{time}초</div>
              </div>
              <div className="bg-orange-50/50 p-4 rounded-3xl border border-orange-100/50">
                <div className="text-[9px] font-black text-orange-300 uppercase tracking-wider mb-1">실수</div>
                <div className="text-2xl font-black text-orange-400">{fails}회</div>
              </div>
            </div>

            {/* Leaderboard Section */}
            {!isSaving && topPlayers.length > 0 && (
              <div className="bg-orange-50/30 rounded-3xl p-5 space-y-3 border border-orange-100/30">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="h-[1px] w-4 bg-orange-100"></div>
                  <span className="text-[10px] font-black text-orange-300 uppercase tracking-tighter">Top 3 과일 왕</span>
                  <div className="h-[1px] w-4 bg-orange-100"></div>
                </div>
                <div className="space-y-2">
                  {topPlayers.map((player, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/60 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border border-white">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-black ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : "text-amber-600"}`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                        </span>
                        <span className="text-sm font-bold text-orange-600 truncate max-w-[80px]">{player.name}</span>
                      </div>
                      <span className="text-xs font-black text-orange-400">{player.finishTime}초</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setGameStatus("start")} className="w-full py-4 bg-orange-500 text-white font-black text-lg rounded-2xl shadow-lg hover:bg-orange-600 transition-all active:scale-95">
              다시 도전하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
