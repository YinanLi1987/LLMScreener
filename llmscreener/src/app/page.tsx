"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import Papa from "papaparse";
export default function HomePage() {
  const [file, setFile] = useState(null);
  const [parsedCSVData, setParsedCSVData] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [criteria, setCriteria] = useState([""]);
  const [selectedLLMs, setSelectedLLMs] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState([]);
  const [hasResults, setHasResults] = useState(false);
  const [activeLLM, setActiveLLM] = useState(selectedLLMs[0] || null);
  const [confirmedEntities, setConfirmedEntities] = useState({});

  const llmOptions = [
    { id: "gpt-4", name: "GPT-4" },
    { id: "claude-3", name: "Claude 3" },
    { id: "llama-3", name: "Llama 3" },
    { id: "gemini-pro", name: "Gemini Pro" },
    { id: "mistral", name: "Mistral" },
  ];
  useEffect(() => {
    const merged = {};
    results.forEach((item) => {
      const mergedFields = {};
      selectedLLMs.forEach((llmId) => {
        const extracted = item.evaluations[llmId]?.extracted || {};
        Object.entries(extracted).forEach(([key, values]) => {
          if (!mergedFields[key]) mergedFields[key] = new Set();
          values.forEach((val) => mergedFields[key].add(val));
        });
      });

      const mergedFinal = {};
      Object.entries(mergedFields).forEach(([key, valSet]) => {
        mergedFinal[key] = Array.from(valSet);
      });

      merged[item.id] = mergedFinal;
    });

    setConfirmedEntities(merged);
  }, [results]);

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
  const toggleEvaluation = (resultId, llmId) => {
    setResults(
      results.map((item) => {
        if (item.id === resultId) {
          const current = item.evaluations[llmId]?.result || "unknown";
          let next;
          if (current === "include") next = "exclude";
          else if (current === "exclude") next = "unknown";
          else next = "include";

          return {
            ...item,
            evaluations: {
              ...item.evaluations,
              [llmId]: {
                ...item.evaluations[llmId],
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
    const results = selectedLLMs.map((id) => evaluations[id]?.result);

    if (results.length === 0) return "unknown";
    if (results.every((r) => r === "include")) return "include";
    if (results.every((r) => r === "exclude")) return "exclude";
    return "unknown";
  };

  // 渲染评估结果图标
  const renderEvaluationIcon = (result) => {
    switch (result) {
      case "include":
        return (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-800">
            ✅
          </span>
        );
      case "exclude":
        return (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-800">
            ✕
          </span>
        );
      case "unknown":
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
  const highlightSentences = (text, evidence) => {
    if (!evidence) return text;

    const fieldColors = {
      Population: "bg-blue-100 text-blue-800",
      Intervention: "bg-green-100 text-green-800",
      Outcome: "bg-purple-100 text-purple-800",
    };

    let result = text;

    Object.entries(evidence).forEach(([field, sentences]) => {
      const colorClass = fieldColors[field] || "bg-yellow-100 text-yellow-800";
      sentences.forEach((sentence) => {
        const safeSentence = sentence.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`(${safeSentence})`, "g");
        result = result.replace(
          regex,
          `<span class="px-1 rounded ${colorClass} font-medium">$1</span>`
        );
      });
    });

    return result;
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
                              <td
                                className="px-6 py-4 max-w-xs truncate whitespace-nowrap overflow-hidden text-sm text-gray-900"
                                title={item.title}
                              >
                                {item.title}
                              </td>

                              {selectedLLMs.map((llmId) => {
                                const llmName = llmOptions.find(
                                  (llm) => llm.id === llmId
                                ).name;
                                const evalResult =
                                  item.evaluations[llmId]?.result || "unknown";
                                return (
                                  <td
                                    key={`${item.id}-${llmId}`}
                                    className="px-6 py-4 whitespace-nowrap text-center text-sm cursor-pointer hover:bg-gray-100"
                                    onClick={() =>
                                      toggleEvaluation(item.id, llmId)
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

                                      {/* LLM 切换按钮组 */}
                                      <div className="flex flex-wrap gap-2 mb-2 mt-1">
                                        {selectedLLMs.map((llmId) => {
                                          const llmName =
                                            llmOptions.find(
                                              (llm) => llm.id === llmId
                                            )?.name || llmId;
                                          const isActive = llmId === activeLLM;

                                          return (
                                            <button
                                              key={llmId}
                                              onClick={() =>
                                                setActiveLLM(llmId)
                                              }
                                              className={`px-3 py-1 rounded-md text-sm font-medium border ${
                                                isActive
                                                  ? "bg-blue-600 text-white border-blue-700"
                                                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
                                              }`}
                                            >
                                              {llmName}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {/* 高亮展示 abstract */}
                                      {activeLLM && (
                                        <div
                                          className="text-gray-800"
                                          dangerouslySetInnerHTML={{
                                            __html: highlightSentences(
                                              item.abstract,
                                              item.evaluations[activeLLM]
                                                ?.evidence
                                            ),
                                          }}
                                        />
                                      )}
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
                                          item.evaluations[llmId] || {};
                                        return (
                                          <div
                                            key={`${item.id}-${llmId}-detail`}
                                            className="border p-3 rounded-lg"
                                          >
                                            <div className="flex items-center mb-2">
                                              <span
                                                className="cursor-pointer"
                                                onClick={() =>
                                                  toggleEvaluation(
                                                    item.id,
                                                    llmId
                                                  )
                                                }
                                              >
                                                {renderEvaluationIcon(
                                                  evalData.result
                                                )}
                                              </span>
                                              <p className="font-medium text-gray-900">
                                                {llmName}
                                              </p>
                                            </div>
                                            <p className="text-sm text-gray-700">
                                              {evalData.reason ||
                                                "No evaluation available"}
                                            </p>
                                            {evalData.extracted && (
                                              <div className="mt-2 text-sm text-gray-700 space-y-1">
                                                {Object.entries(
                                                  evalData.extracted
                                                ).map(([key, values]) => (
                                                  <div key={key}>
                                                    <span className="font-medium">
                                                      {key}:
                                                    </span>{" "}
                                                    {Array.isArray(values)
                                                      ? values.join(", ")
                                                      : values}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className="mt-4">
                                      <h3 className="font-semibold text-gray-900 mb-2">
                                        Final Entities
                                      </h3>
                                      {Object.entries(
                                        confirmedEntities[item.id] || {}
                                      ).map(([field, values]) => (
                                        <div key={field} className="mb-2">
                                          <p className="text-sm font-medium mb-1">
                                            {field}:
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                            {values.map((val, idx) => (
                                              <span
                                                key={`${field}-${val}-${idx}`}
                                                className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full"
                                              >
                                                {val}
                                                <button
                                                  className="ml-1 text-blue-600 hover:text-blue-900"
                                                  onClick={() => {
                                                    const updated = {
                                                      ...confirmedEntities,
                                                    };
                                                    updated[item.id][field] =
                                                      updated[item.id][
                                                        field
                                                      ].filter(
                                                        (v) => v !== val
                                                      );
                                                    setConfirmedEntities(
                                                      updated
                                                    );
                                                  }}
                                                >
                                                  ×
                                                </button>
                                              </span>
                                            ))}
                                            <input
                                              type="text"
                                              placeholder="+ Add"
                                              className="border rounded px-2 py-1 text-sm"
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  const val =
                                                    e.target.value.trim();
                                                  if (!val) return;
                                                  const updated = {
                                                    ...confirmedEntities,
                                                  };
                                                  if (!updated[item.id])
                                                    updated[item.id] = {};
                                                  if (!updated[item.id][field])
                                                    updated[item.id][field] =
                                                      [];
                                                  if (
                                                    !updated[item.id][
                                                      field
                                                    ].includes(val)
                                                  ) {
                                                    updated[item.id][
                                                      field
                                                    ].push(val);
                                                  }
                                                  setConfirmedEntities(updated);
                                                  e.target.value = "";
                                                }
                                              }}
                                            />
                                          </div>
                                        </div>
                                      ))}
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
                      <span>Include</span>
                    </div>
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-100 text-red-800 mr-1">
                        ✕
                      </span>
                      <span>Exclude</span>
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
