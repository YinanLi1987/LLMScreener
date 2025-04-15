"use client";

import { useState } from "react";
import Head from "next/head";

export default function HomePage() {
  const [file, setFile] = useState(null);
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

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile && uploadedFile.type === "text/csv") {
      setFile(uploadedFile);
    } else {
      alert("Please upload a valid CSV file");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      setFile(droppedFile);
    }
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

  const runTest = () => {
    setIsTesting(true);
    setHasResults(true);

    setTimeout(() => {
      setIsTesting(false);
    }, 1000);
  };

  const runAnalysis = () => {
    setIsTesting(false);
    setHasResults(true);
  };

  const isReady =
    file && prompt && criteria.some((c) => c.trim()) && selectedLLMs.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>LLM Analysis Dashboard</title>
        <meta
          name="description"
          content="Analyze LLM performance with custom criteria"
        />
      </Head>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
          LLM Analysis Dashboard
        </h1>

        {/* Configuration Section */}
        <div className="space-y-6 mb-8">
          {/* File Upload */}
          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              1. Upload CSV File
            </h2>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("file-upload").click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              {file ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm truncate max-w-xs text-gray-800">
                      {file.name}
                    </span>
                  </div>
                  <button
                    className="text-gray-600 hover:text-gray-900"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById("file-upload").value = "";
                      setFile(null);
                    }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <svg
                    className="w-8 h-8 text-gray-500 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm text-gray-700">
                    Drag & drop your CSV file here or click to browse
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Supports .csv files only
                  </p>
                </div>
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
