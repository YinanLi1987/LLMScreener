"use client";

import { useState } from "react";
import Head from "next/head";
import Papa from "papaparse";
export default function HomePage() {
  const [file, setFile] = useState(null);
  const [parsedCSVData, setParsedCSVData] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [criteria, setCriteria] = useState([""]);
  const [selectedLLMs, setSelectedLLMs] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const llmOptions = [
    { id: "gpt-4", name: "GPT-4" },
    { id: "claude-3", name: "Claude 3" },
    { id: "llama-3", name: "Llama 3" },
    { id: "gemini-pro", name: "Gemini Pro" },
    { id: "mistral", name: "Mistral" },
  ];

  // 模拟结果数据
  const [results, setResults] = useState([
    {
      id: 1,
      title: "Deep Learning in Biology",
      abstract:
        "Study of AI in healthcare applications, focusing on diagnostic tools and treatment optimization...",
      keywords: "AI, Health",
      evaluations: {
        "GPT-4": {
          result: "yes",
          reason: "Matches AI in health criteria perfectly",
        },
        Claude: {
          result: "no",
          reason: "Not enough context about specific medical applications",
        },
        Gemini: {
          result: "unknown",
          reason: "Uncertain due to lack of technical details in abstract",
        },
      },
      expanded: false,
    },
    {
      id: 2,
      title: "AI in Medicine",
      abstract:
        "The rise of AI in medical field diagnostics, with case studies from radiology and pathology...",
      keywords: "AI, Medicine",
      evaluations: {
        "GPT-4": {
          result: "yes",
          reason: "Clear medical application with good technical depth",
        },
        Claude: {
          result: "yes",
          reason: "Well-structured case studies fit Claude's strengths",
        },
        Gemini: {
          result: "yes",
          reason: "Excellent fit for medical diagnostics",
        },
      },
      expanded: false,
    },
  ]);

  const handleFileSelect = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    // 限制 4MB
    if (uploadedFile.size > 4 * 1024 * 1024) {
      alert("File too large. Please upload a file smaller than 4MB.");
      return;
    }

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row, index) => ({
          id: index + 1,
          title: row.title || row.Title || "",
          abstract: row.abstract || row.Abstract || "",
          keywords: row.keywords || row.Keywords || "",
        }));
        // console.log("📦 Parsed CSV data:", rows);
        setParsedCSVData(rows);
        setFile({ name: uploadedFile.name });
      },
      error: (err) => {
        console.error("CSV parsing error:", err);
        alert("Failed to parse CSV file.");
      },
    });
  };
  const handleFileRemove = (e) => {
    e.stopPropagation();
    setFile(null);
    setParsedCSVData([]);
    document.getElementById("file-upload").value = ""; // reset the input
  };

  const handleCriteriaChange = (index, value) => {
    const newCriteria = [...criteria];
    newCriteria[index] = value;
    setCriteria(newCriteria);
  };

  const addCriteria = () => {
    setCriteria([...criteria, ""]);
  };

  const removeCriteria = (index) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter((_, i) => i !== index));
    }
  };

  const handleLLMSelection = (llmId) => {
    if (selectedLLMs.includes(llmId)) {
      setSelectedLLMs(selectedLLMs.filter((id) => id !== llmId));
    } else if (selectedLLMs.length < 3) {
      setSelectedLLMs([...selectedLLMs, llmId]);
    }
  };

  // 切换评估结果
  const toggleEvaluation = (resultId, llmName) => {
    setResults(
      results.map((item) => {
        if (item.id === resultId) {
          const current = item.evaluations[llmName]?.result || "unknown";
          let next;
          if (current === "yes") next = "no";
          else if (current === "no") next = "unknown";
          else next = "yes";

          return {
            ...item,
            evaluations: {
              ...item.evaluations,
              [llmName]: {
                ...item.evaluations[llmName],
                result: next,
              },
            },
          };
        }
        return item;
      })
    );
  };

  // 计算最终结果
  const calculateFinalResult = (evaluations, selectedLLMs) => {
    const llmNames = selectedLLMs.map(
      (id) => llmOptions.find((llm) => llm.id === id).name
    );
    const results = llmNames.map((name) => evaluations[name]?.result);

    if (results.length === 0) return "unknown";
    if (results.every((r) => r === "yes")) return "yes";
    if (results.every((r) => r === "no")) return "no";
    return "unknown";
  };

  // 渲染评估结果图标
  const renderEvaluationIcon = (result) => {
    switch (result) {
      case "yes":
        return (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-800">
            ✅
          </span>
        );
      case "no":
        return (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-800">
            ✕
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-yellow-100 text-yellow-800">
            ?
          </span>
        );
    }
  };

  const toggleExpand = (id) => {
    setResults(
      results.map((item) =>
        item.id === id ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

  const runTest = async () => {
    if (!parsedCSVData || parsedCSVData.length < 1) return;

    const sample = [...parsedCSVData]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        criteria,
        selectedLLMs,
        papers: sample,
      }),
    });

    const data = await response.json();
    setResults(data.results);
    setHasResults(true);
  };

  const runAnalysis = async () => {
    if (!parsedCSVData || parsedCSVData.length < 1) return;

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        criteria,
        selectedLLMs,
        papers: parsedCSVData,
      }),
    });

    const data = await response.json();
    setResults(data.results);
    setHasResults(true);
  };

  const isReady =
    file && prompt && criteria.some((c) => c.trim()) && selectedLLMs.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>LLM Screener</title>
        <meta
          name="description"
          content="Analyze LLM performance with custom criteria"
        />
      </Head>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
          LLM Screener
        </h1>

        {/* Configuration Section */}
        <div className="space-y-6 mb-8">
          {/* File Upload */}
          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              1. Parse CSV File
            </h2>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => document.getElementById("file-upload").click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-800">
                    Selected file: {file.name}
                  </p>
                  <button
                    onClick={(e) => handleFileRemove(e)}
                    className="text-sm text-red-600 hover:text-red-800 ml-4"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-gray-700">Click to select your CSV file</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Max file size: 4MB
                  </p>
                </>
              )}
            </div>
          </div>

          {/* LLM Prompt */}
          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              2. Enter Your Prompt
            </h2>
            <textarea
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              placeholder="Enter your natural language prompt here..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Criteria Input */}
          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              3. Evaluation Criteria
            </h2>
            <div className="space-y-3">
              {criteria.map((criterion, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                    placeholder={`Criterion #${index + 1}`}
                    value={criterion}
                    onChange={(e) =>
                      handleCriteriaChange(index, e.target.value)
                    }
                  />
                  {criteria.length > 1 && (
                    <button
                      type="button"
                      className="p-2 text-red-600 hover:text-red-800"
                      onClick={() => removeCriteria(index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="mt-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
                onClick={addCriteria}
              >
                + Add Another Criterion
              </button>
            </div>
          </div>

          {/* Choose LLM */}
          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              4. Select LLMs (Max 3)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {llmOptions.map((llm) => (
                <div key={llm.id} className="flex items-center">
                  <input
                    id={`llm-${llm.id}`}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={selectedLLMs.includes(llm.id)}
                    onChange={() => handleLLMSelection(llm.id)}
                    disabled={
                      selectedLLMs.length >= 3 && !selectedLLMs.includes(llm.id)
                    }
                  />
                  <label
                    htmlFor={`llm-${llm.id}`}
                    className="ml-2 block text-sm text-gray-800"
                  >
                    {llm.name}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-700 mt-2">
              {selectedLLMs.length}/3 LLMs selected
            </p>
          </div>

          {/* Action Buttons */}
          <div className="bg-white p-5 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
              <button
                className={`px-4 py-3 rounded-md font-medium ${
                  isReady
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-300 text-gray-800 cursor-not-allowed"
                }`}
                onClick={runAnalysis}
                disabled={!isReady || isTesting}
              >
                {isTesting ? "Analyzing..." : "Run Full Analysis"}
              </button>
              <button
                className={`px-4 py-3 rounded-md font-medium ${
                  isReady
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-300 text-gray-800 cursor-not-allowed"
                }`}
                onClick={runTest}
                disabled={!isReady || isTesting}
              >
                {isTesting ? "Testing..." : "Test 3 Samples"}
              </button>
            </div>
            {isTesting && (
              <div className="mt-3 text-sm text-blue-700">
                Testing 3 random samples. Review results before running full
                analysis.
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Analysis Result */}
          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Analysis Results
            </h2>
            {hasResults ? (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                          Title
                        </th>
                        {selectedLLMs.map((llmId) => (
                          <th
                            key={llmId}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
                          >
                            {llmOptions.find((llm) => llm.id === llmId).name}
                          </th>
                        ))}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                          Result
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map((item) => {
                        const finalResult = calculateFinalResult(
                          item.evaluations,
                          selectedLLMs
                        );
                        return (
                          <>
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.title}
                              </td>
                              {selectedLLMs.map((llmId) => {
                                const llmName = llmOptions.find(
                                  (llm) => llm.id === llmId
                                ).name;
                                const evalResult =
                                  item.evaluations[llmName]?.result ||
                                  "unknown";
                                return (
                                  <td
                                    key={`${item.id}-${llmId}`}
                                    className="px-6 py-4 whitespace-nowrap text-center text-sm cursor-pointer hover:bg-gray-100"
                                    onClick={() =>
                                      toggleEvaluation(item.id, llmName)
                                    }
                                  >
                                    {renderEvaluationIcon(evalResult)}
                                  </td>
                                );
                              })}
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                {renderEvaluationIcon(finalResult)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => toggleExpand(item.id)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  {item.expanded ? "Collapse" : "Expand"}
                                </button>
                              </td>
                            </tr>
                            {item.expanded && (
                              <tr className="bg-gray-50">
                                <td
                                  colSpan={selectedLLMs.length + 3}
                                  className="px-6 py-4 text-sm text-gray-800"
                                >
                                  <div className="space-y-4">
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        Title:
                                      </p>
                                      <p>{item.title}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        Abstract:
                                      </p>
                                      <p>{item.abstract}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        Keywords:
                                      </p>
                                      <p>{item.keywords}</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                      {selectedLLMs.map((llmId) => {
                                        const llmName = llmOptions.find(
                                          (llm) => llm.id === llmId
                                        ).name;
                                        const evalData =
                                          item.evaluations[llmName] || {};
                                        return (
                                          <div
                                            key={`${item.id}-${llmId}-detail`}
                                            className="border p-3 rounded-lg"
                                          >
                                            <div className="flex items-center mb-2">
                                              <span
                                                className={`inline-flex items-center justify-center h-6 w-6 rounded-full mr-2 cursor-pointer hover:opacity-80 ${
                                                  evalData.result === "yes"
                                                    ? "bg-green-100 text-green-800"
                                                    : evalData.result === "no"
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-yellow-100 text-yellow-800"
                                                }`}
                                                onClick={() =>
                                                  toggleEvaluation(
                                                    item.id,
                                                    llmName
                                                  )
                                                }
                                              >
                                                {evalData.result === "yes"
                                                  ? "✅"
                                                  : evalData.result === "no"
                                                  ? "✕"
                                                  : "?"}
                                              </span>
                                              <p className="font-medium text-gray-900">
                                                {llmName}
                                              </p>
                                            </div>
                                            <p className="text-sm text-gray-700">
                                              {evalData.reason ||
                                                "No evaluation available"}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-100 text-green-800 mr-1">
                        ✅
                      </span>
                      <span>Yes</span>
                    </div>
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-100 text-red-800 mr-1">
                        ✕
                      </span>
                      <span>No</span>
                    </div>
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-yellow-100 text-yellow-800 mr-1">
                        ?
                      </span>
                      <span>Unknown</span>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-800">
                      Copy to Clipboard
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Export as CSV
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-600 bg-gray-50 rounded-md">
                {isReady
                  ? 'Click "Test 3 Samples" or "Run Full Analysis" to see results'
                  : "Complete all required fields to enable analysis"}
              </div>
            )}
          </div>

          {/* Dashboard */}
          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Performance Dashboard
            </h2>
            {hasResults ? (
              <div>
                <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center mb-4">
                  <div className="text-center">
                    <p className="text-lg font-medium mb-2 text-gray-900">
                      {isTesting ? "Test Results" : "Full Analysis Results"}
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedLLMs.map((llmId, index) => {
                        const llmName = llmOptions.find(
                          (llm) => llm.id === llmId
                        ).name;
                        const colors = [
                          "bg-blue-100 text-blue-800",
                          "bg-green-100 text-green-800",
                          "bg-yellow-100 text-yellow-800",
                        ];
                        return (
                          <div
                            key={llmId}
                            className="bg-white p-3 rounded shadow"
                          >
                            <p className="font-medium text-gray-900">
                              {llmName}
                            </p>
                            <p
                              className={`text-2xl font-bold mt-1 p-2 rounded-full ${colors[index]}`}
                            >
                              {Math.floor(Math.random() * 40 + 60)}%
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-800">
                    Export as PNG
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-800">
                    Export Data (CSV)
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-600 bg-gray-50 rounded-md">
                Performance visualization will appear here after analysis
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
