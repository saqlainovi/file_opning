import React, { useRef } from 'react';
import { Printer, X, Download, BookOpen } from 'lucide-react';
import { PilotProjectEntry } from '../types';
import { PRIMARY_PILOT_BOOKS, SECONDARY_PILOT_BOOKS, PilotBookItem } from '../data/pilotBooksData';
import { toBengaliNumerals } from '../utils/bengaliToWords';
import { BangladeshGovtSeal } from './BangladeshGovtSeal';

interface PilotChallanModalProps {
  project: PilotProjectEntry;
  onClose: () => void;
}

export default function PilotChallanModal({ project, onClose }: PilotChallanModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const isPrimary = project.level === 'primary';
  const defaultBooks = isPrimary ? PRIMARY_PILOT_BOOKS : SECONDARY_PILOT_BOOKS;
  const books: PilotBookItem[] = project.customBooks && project.customBooks.length > 0
    ? project.customBooks
    : defaultBooks;

  // Calculate total books
  const totalBookCount = books.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  // Level label
  const levelLabel = isPrimary 
    ? 'প্রাথমিক' 
    : project.level === 'uchcho_madhyomik' 
      ? 'উচ্চ মাধ্যমিক' 
      : 'মাধ্যমিক';

  // Split into 2 columns (Left: 1-25, Right: 26-48)
  const leftBooks = books.slice(0, 25);
  const rightBooks = books.slice(25);
  const leftSum = leftBooks.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadText = () => {
    let content = `গণপ্রজাতন্ত্রী বাংলাদেশ সরকার\n`;
    content += `মাধ্যমিক ও উচ্চ শিক্ষা বিভাগ\n`;
    content += `শিক্ষা মন্ত্রণালয়\n\n`;
    content += `দেশব্যাপী বইপড়া কর্মসূচির পাইলট কার্যক্রম ২০২৬ (${levelLabel})\n`;
    content += `বাস্তবায়ন: বিশ্বসাহিত্য কেন্দ্র\n`;
    content += `বই সরবরাহের চালান নম্বর: ${project.challanNo || '০০০১'}\n\n`;
    content += `প্রতিষ্ঠানের নাম: ${project.institutionName}\n`;
    content += `উপজেলা: ${project.upazila || '—'} | জেলা: ${project.district || '—'}\n`;
    content += `EIIN: ${project.eiin || '—'} | Code No: ${project.codeNo || '—'}\n\n`;
    content += `শিক্ষা প্রতিষ্ঠানে সরবরাহকৃত শ্রেণিভিত্তিক বইয়ের বিবরণ:\n`;
    content += `--------------------------------------------------------\n`;
    
    books.forEach(b => {
      content += `${b.sl}. [${b.class}] ${b.title} ${b.author ? `(${b.author})` : ''} - ${b.quantity} টি\n`;
    });

    content += `--------------------------------------------------------\n`;
    content += `মোট বই সংখ্যা: ${totalBookCount} টি\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Challan_${project.institutionName || 'School'}_${levelLabel}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 flex flex-col max-h-[98vh] my-auto">
        {/* Action Header Bar - Hidden during print */}
        <div className="print:hidden bg-[#0A111E] text-white px-5 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>চালান প্রিন্ট প্রিভিউ (অফিসিয়াল ফরম্যাট)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-500/30">
                  A4 সিঙ্গেল পেজ
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {project.institutionName || 'শিক্ষা প্রতিষ্ঠান'} • {levelLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadText}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-700"
            >
              <Download size={13} />
              <span>টেক্সট ফাইল</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <Printer size={15} />
              <span>প্রিন্ট করুন (A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="hover:bg-white/10 p-1.5 rounded-lg transition text-slate-400 hover:text-white cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (Exact 1:1 Excel/Official Sheet Replica) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100/70 print:bg-white print:p-0 print:overflow-visible flex justify-center">
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 6mm 8mm 6mm 8mm;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                color: #000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body * {
                visibility: hidden;
              }
              #printable-challan-sheet, #printable-challan-sheet * {
                visibility: visible;
              }
              #printable-challan-sheet {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                font-size: 11px !important;
                line-height: 1.15 !important;
                color: #000 !important;
              }
              .challan-main-table, .challan-main-table td, .challan-main-table th {
                border-color: #000 !important;
              }
            }
          `}</style>

          {/* Official Document Sheet Container */}
          <div 
            id="printable-challan-sheet"
            ref={printAreaRef}
            className="bg-white text-black w-full max-w-[210mm] p-6 sm:p-8 shadow-md print:shadow-none border border-slate-300 print:border-none font-serif text-[11px] leading-tight select-text"
          >
            {/* MAIN OUTER TABLE / FRAME */}
            <div className="border border-black">
              {/* HEADER SECTION (2 MAIN COLUMNS) */}
              <div className="grid grid-cols-12 border-b border-black">
                {/* Left Column: Govt Logo & Education Ministry */}
                <div className="col-span-5 border-r border-black p-2 flex items-center justify-center gap-2.5">
                  <BangladeshGovtSeal size={52} className="text-black shrink-0" />
                  <div className="text-left font-sans leading-tight">
                    <p className="text-[11px] font-bold tracking-tight text-black">
                      গণপ্রজাতন্ত্রী বাংলাদেশ সরকার
                    </p>
                    <p className="text-[13px] font-black tracking-tight text-black mt-0.5">
                      মাধ্যমিক ও উচ্চ শিক্ষা বিভাগ
                    </p>
                    <p className="text-[11px] font-bold tracking-tight text-black">
                      শিক্ষা মন্ত্রণালয়
                    </p>
                  </div>
                </div>

                {/* Right Column: Project Details & Challan Number */}
                <div className="col-span-7 flex flex-col justify-between text-center font-sans">
                  {/* Row 1: Program Name & Level */}
                  <div className="p-1.5 border-b border-black font-extrabold text-[13px] tracking-tight">
                    দেশব্যাপী বইপড়া কর্মসূচির পাইলট<br />
                    কার্যক্রম ২০২৬ ({levelLabel})
                  </div>
                  {/* Row 2: Implementation Org */}
                  <div className="p-1 border-b border-black font-bold text-[12px]">
                    বাস্তবায়ন: বিশ্বসাহিত্য কেন্দ্র
                  </div>
                  {/* Row 3: Challan Number */}
                  <div className="p-1 font-bold text-[11px]">
                    বই সরবরাহের চালান নম্বর: {toBengaliNumerals(project.challanNo || '০০০১')}
                  </div>
                </div>
              </div>

              {/* INSTITUTION DETAILS BOX */}
              {/* Row 1: Institution Name */}
              <div className="border-b border-black p-1.5 text-center font-sans font-bold text-[13px]">
                <span>প্রতিষ্ঠানের নাম: </span>
                <span className="font-extrabold">{project.institutionName || '—'}</span>
              </div>

              {/* Row 2: Upazila & District */}
              <div className="grid grid-cols-2 border-b border-black text-[12px] font-sans font-semibold">
                <div className="border-r border-black p-1 pl-4 text-center">
                  <span className="font-bold">উপজেলা: </span>
                  <span>{project.upazila || '—'}</span>
                </div>
                <div className="p-1 pr-4 text-center">
                  <span className="font-bold">জেলা: </span>
                  <span>{project.district || '—'}</span>
                </div>
              </div>

              {/* Row 3: EIIN & Code No */}
              <div className="grid grid-cols-2 border-b border-black text-[12px] font-sans font-semibold">
                <div className="border-r border-black p-1 text-center font-mono">
                  <span className="font-sans font-bold">EIIN: </span>
                  <span className="font-bold">{project.eiin || '—'}</span>
                </div>
                <div className="p-1 text-center font-mono">
                  <span className="font-sans font-bold">Code No: </span>
                  <span className="font-bold">{project.codeNo || '—'}</span>
                </div>
              </div>

              {/* TABLE TITLE BANNER */}
              <div className="p-1 text-center font-sans font-extrabold text-[12px] border-b border-black bg-slate-50 print:bg-transparent">
                শিক্ষা প্রতিষ্ঠানে সরবরাহকৃত শ্রেণিভিত্তিক বইয়ের বিবরণ
              </div>

              {/* BOOKS 2-COLUMN TABLE (EXACT EXCEL / OFFICIAL LAYOUT) */}
              <table className="w-full border-collapse text-[10.5px] leading-tight font-sans">
                <thead>
                  <tr className="border-b border-black text-center font-bold text-[11px]">
                    {/* Left 4 columns */}
                    <th className="border-r border-black p-0.5 w-[30px]">ক্রম</th>
                    <th className="border-r border-black p-0.5 w-[36px]">শ্রেণি</th>
                    <th className="border-r border-black p-0.5 text-left pl-1.5">বইয়ের নাম</th>
                    <th className="border-r-2 border-black p-0.5 w-[42px]">সংখ্যা</th>

                    {/* Right 4 columns */}
                    <th className="border-r border-black p-0.5 w-[30px]">ক্রম</th>
                    <th className="border-r border-black p-0.5 w-[36px]">শ্রেণি</th>
                    <th className="border-r border-black p-0.5 text-left pl-1.5">বইয়ের নাম</th>
                    <th className="p-0.5 w-[42px]">সংখ্যা</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 25 }).map((_, idx) => {
                    const left = leftBooks[idx];
                    // Right column: Row 0 is "পূর্বের কলামের জের"
                    // Rows 1-23 are rightBooks[0] through rightBooks[22] (sl 26 to 48)
                    // Row 24 (idx 24) is "মোট বই সংখ্যা"
                    const isRightFirstRow = idx === 0;
                    const isRightLastRow = idx === 24;
                    const right = (!isRightFirstRow && !isRightLastRow) ? rightBooks[idx - 1] : null;

                    return (
                      <tr key={idx} className="border-b border-black">
                        {/* Left Side Columns */}
                        <td className="border-r border-black p-0.5 text-center font-semibold">
                          {left ? toBengaliNumerals(left.sl.toString()) : ''}
                        </td>
                        <td className="border-r border-black p-0.5 text-center font-semibold">
                          {left?.class || ''}
                        </td>
                        <td className="border-r border-black p-0.5 pl-1.5 text-left truncate max-w-[185px]">
                          {left?.title || ''}
                        </td>
                        <td className="border-r-2 border-black p-0.5 text-center font-bold font-mono">
                          {left ? toBengaliNumerals(left.quantity.toString()) : ''}
                        </td>

                        {/* Right Side Columns */}
                        {isRightFirstRow ? (
                          <>
                            <td colSpan={3} className="border-r border-black p-0.5 text-right pr-2 font-bold">
                              পূর্বের কলামের জের
                            </td>
                            <td className="p-0.5 text-center font-bold font-mono">
                              {toBengaliNumerals(leftSum.toString())}
                            </td>
                          </>
                        ) : isRightLastRow ? (
                          <>
                            <td colSpan={3} className="border-r border-black p-0.5 text-right pr-2 font-bold">
                              মোট বই সংখ্যা
                            </td>
                            <td className="p-0.5 text-center font-black font-mono text-[11.5px]">
                              {toBengaliNumerals(totalBookCount.toString())}
                            </td>
                          </>
                        ) : right ? (
                          <>
                            <td className="border-r border-black p-0.5 text-center font-semibold">
                              {toBengaliNumerals(right.sl.toString())}
                            </td>
                            <td className="border-r border-black p-0.5 text-center font-semibold">
                              {right.class}
                            </td>
                            <td className="border-r border-black p-0.5 pl-1.5 text-left truncate max-w-[185px]">
                              {right.title}
                            </td>
                            <td className="p-0.5 text-center font-bold font-mono">
                              {toBengaliNumerals(right.quantity.toString())}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="border-r border-black p-0.5"></td>
                            <td className="border-r border-black p-0.5"></td>
                            <td className="border-r border-black p-0.5"></td>
                            <td className="p-0.5"></td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* SIGNATURE SECTION (EXACT 3-SIGNATURE LAYOUT) */}
              <div className="pt-10 pb-3 px-4 grid grid-cols-3 gap-2 text-center text-[10.5px] font-sans font-bold">
                <div>
                  <span className="inline-block border-t border-black pt-1 px-3">
                    প্রেরণকারীর স্বাক্ষর
                  </span>
                </div>
                <div>
                  <span className="inline-block border-t border-black pt-1 px-3">
                    অনুমোদনকারী
                  </span>
                </div>
                <div>
                  <span className="inline-block border-t border-black pt-1 px-3">
                    গ্রহণকারীর স্বাক্ষর, তারিখ ও সিল
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
