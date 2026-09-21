(function () {
  if ("undefined" == typeof window) {
    return;
  }

  var GLOBAL_KEY = "__SFS2X_OFFLINE_PROFIT_GUARD__";
  var LOCAL_SETTINGS_KEY = GLOBAL_KEY + "_LOCAL_SETTINGS_V1";
  var PANEL_VERSION = "2026.09.20-monitor-toolbar-watertrend-float-v13";
  var MONEY_SCALE = 1000;
  var BUILT_IN_PRIMARY_TARGET_IDS = [2, 3, 19, 101];
  var BUILT_IN_SECONDARY_TARGET_IDS = [1, 17];
  var BUILT_IN_HOT_OBSERVATION_TARGET_IDS = [101, 106, 108, 107];
  var BUILT_IN_WARM_OBSERVATION_TARGET_IDS = [105, 102, 103, 19];
  var BUILT_IN_HOT_OBSERVATION_HOUR_SLOTS = ["12", "13", "15"];
  var BUILT_IN_WARM_OBSERVATION_HOUR_SLOTS = ["09", "16"];
  var BUILT_IN_BLACKLIST_TARGET_IDS = [8, 12, 13, 16, 18, 100, 105, 107, 108, 200];
  var BUILT_IN_BLACKLIST_ODDS = [0, 9, 18, 20, 40, 75];
  var BUILT_IN_PROFIT_PRESERVE_ODDS = [2, 3, 4];
  var BUILT_IN_REMOTE_SERVICE_CONFIG = {
    enabled: true,
    loggingEnabled: true,
    configPullEnabled: true,
    serviceBaseUrl: "https://coolx.luckydeal.cn",
    ingestPath: "/api/v1/logs",
    socketPacketIngestPath: "/api/v1/socket/packets",
    configPath: "/api/v1/config/latest",
    clientId: "default",
    apiKey: "zQPR#tvB9iMPziAR5k@o",
    flushIntervalMs: 5000,
    loggingBatchSize: 10,
    queueMax: 200,
    configRefreshMs: 60000,
  };

  function getBuiltInRemoteServiceDefaults() {
    var source = pickObject(BUILT_IN_REMOTE_SERVICE_CONFIG);
    var enabled = false !== source.enabled;
    return {
      remoteLoggingEnabled: !!(enabled && false !== source.loggingEnabled),
      remoteConfigEnabled: !!(enabled && false !== source.configPullEnabled),
      remoteServiceBaseUrl: enabled ? String(source.serviceBaseUrl || "").trim() : "",
      remoteIngestPath: String(source.ingestPath || "/api/v1/logs").trim(),
      remoteSocketPacketIngestPath: String(
        source.socketPacketIngestPath || "/api/v1/socket/packets"
      ).trim(),
      remoteConfigPath: String(source.configPath || "/api/v1/config/latest").trim(),
      remoteClientId: String(source.clientId || "default").trim() || "default",
      remoteApiKey: enabled ? String(source.apiKey || "").trim() : "",
      remoteFlushIntervalMs: Math.max(toInt(source.flushIntervalMs, 5000), 500),
      remoteLoggingBatchSize: Math.max(toInt(source.loggingBatchSize, 10), 1),
      remoteQueueMax: Math.max(toInt(source.queueMax, 200), 10),
      remoteConfigRefreshMs: Math.max(toInt(source.configRefreshMs, 60000), 5000),
    };
  }

  function applyBuiltInRemoteServiceSwitch(config) {
    var next = cloneObject(config);
    var source = pickObject(BUILT_IN_REMOTE_SERVICE_CONFIG);
    var defaults = getBuiltInRemoteServiceDefaults();
    if (false === source.enabled) {
      next.remoteLoggingEnabled = false;
      next.remoteConfigEnabled = false;
      next.remoteServiceBaseUrl = "";
      next.remoteApiKey = "";
      return next;
    }
    if (false === source.loggingEnabled) {
      next.remoteLoggingEnabled = false;
    }
    if (false === source.configPullEnabled) {
      next.remoteConfigEnabled = false;
    }
    if (!String(next.remoteServiceBaseUrl || "").trim()) {
      next.remoteServiceBaseUrl = String(defaults.remoteServiceBaseUrl || "").trim();
    }
    if (!String(next.remoteIngestPath || "").trim()) {
      next.remoteIngestPath = String(defaults.remoteIngestPath || "/api/v1/logs").trim();
    }
    if (!String(next.remoteSocketPacketIngestPath || "").trim()) {
      next.remoteSocketPacketIngestPath = String(
        defaults.remoteSocketPacketIngestPath || "/api/v1/socket/packets"
      ).trim();
    }
    if (!String(next.remoteConfigPath || "").trim()) {
      next.remoteConfigPath = String(defaults.remoteConfigPath || "/api/v1/config/latest").trim();
    }
    if (!String(next.remoteClientId || "").trim()) {
      next.remoteClientId = String(defaults.remoteClientId || "default").trim() || "default";
    }
    if (!String(next.remoteApiKey || "").trim()) {
      next.remoteApiKey = String(defaults.remoteApiKey || "").trim();
    }
    next.remoteFlushIntervalMs = Math.max(
      toInt(next.remoteFlushIntervalMs, defaults.remoteFlushIntervalMs),
      500
    );
    next.remoteLoggingBatchSize = Math.max(
      toInt(next.remoteLoggingBatchSize, defaults.remoteLoggingBatchSize),
      1
    );
    next.remoteQueueMax = Math.max(toInt(next.remoteQueueMax, defaults.remoteQueueMax), 10);
    next.remoteConfigRefreshMs = Math.max(
      toInt(next.remoteConfigRefreshMs, defaults.remoteConfigRefreshMs),
      5000
    );
    return next;
  }

  function toNumber(value, fallback) {
    var num = Number(value);
    return isFinite(num) ? num : fallback;
  }

  function toInt(value, fallback) {
    var num = Math.trunc(toNumber(value, fallback));
    return isFinite(num) ? num : fallback;
  }

  function clamp(value, min, max) {
    var next = toNumber(value, min);
    if (isFinite(min) && next < min) {
      next = min;
    }
    if (isFinite(max) && next > max) {
      next = max;
    }
    return next;
  }

  function pickObject(value) {
    return value && "object" == typeof value && !Array.isArray(value) ? value : {};
  }

  function amountToRawMoney(value) {
    var amount = toNumber(value, 0);
    return isFinite(amount) ? Math.round(amount * MONEY_SCALE) : 0;
  }

  function rawMoneyToAmount(value) {
    var raw = toNumber(value, 0);
    return isFinite(raw) ? raw / MONEY_SCALE : 0;
  }

  function normalizeExternalMoneyToRaw(value) {
    var num = toNumber(value, 0);
    if (!(num > 0)) {
      return 0;
    }
    return num >= 100000 ? Math.round(num) : amountToRawMoney(num);
  }

  function formatAmountValue(value) {
    var amount = toNumber(value, 0);
    if (!isFinite(amount)) {
      return "-";
    }
    var text = amount.toFixed(3).replace(/\.?0+$/, "");
    return "-0" === text ? "0" : text;
  }

  function formatMoneyFromRaw(value) {
    return formatAmountValue(rawMoneyToAmount(value));
  }

  function formatSignedMoneyFromRaw(value) {
    var text = formatMoneyFromRaw(value);
    return "0" === text ? "0" : text;
  }

  function buildOutcomeStatSummary(value, stat) {
    var source = pickObject(stat);
    var sampleCount = Number(source.sampleCount || 0) || 0;
    var hitCount = Number(source.hitCount || 0) || 0;
    var totalBetRaw = Number(source.totalBetRaw || 0) || 0;
    var totalWinRaw = Number(source.totalWinRaw || 0) || 0;
    return {
      value: Number(value || 0) || 0,
      sampleCount: sampleCount,
      hitCount: hitCount,
      totalBetRaw: totalBetRaw,
      totalWinRaw: totalWinRaw,
      rtpRatio: totalBetRaw > 0 ? totalWinRaw / totalBetRaw : 0,
      hitRate: sampleCount > 0 ? hitCount / sampleCount : 0,
      updatedAt: Date.now(),
    };
  }

  function getOutcomeStatSummaryFromBucket(bucket, value) {
    var key = String(Number(value || 0) || 0);
    if (!key || "0" === key || !bucket || "object" != typeof bucket) {
      return null;
    }
    var stat = pickObject(bucket[key]);
    if (!(Number(stat.sampleCount || 0) > 0)) {
      return null;
    }
    return buildOutcomeStatSummary(value, stat);
  }

  function formatAdaptiveBlacklistSummary(entry, prefix) {
    var item = pickObject(entry);
    var valueText = String(prefix || "") + String(Number(item.value || 0) || 0);
    if (!(Number(item.sampleCount || 0) > 0)) {
      return valueText;
    }
    return (
      valueText +
      " / 样本 " +
      String(Number(item.sampleCount || 0) || 0) +
      " / RTP " +
      formatAmountValue((Number(item.rtpRatio || 0) || 0) * 100) +
      "%"
    );
  }

  function cloneArray(list) {
    return Array.isArray(list) ? list.slice() : [];
  }

  function cloneObject(obj) {
    var source = pickObject(obj);
    var next = {};
    var key = "";
    for (key in source) {
      next[key] = source[key];
    }
    return next;
  }

  function readLocalSettings() {
    if ("undefined" == typeof localStorage) {
      return {};
    }
    try {
      return pickObject(parseJsonObjectSafe(localStorage.getItem(LOCAL_SETTINGS_KEY)) || {});
    } catch (err) {
      return {};
    }
  }

  function writeLocalSettings(partial) {
    if ("undefined" == typeof localStorage) {
      return {};
    }
    var current = readLocalSettings();
    var next = cloneObject(current);
    var source = pickObject(partial);
    var key = "";
    for (key in source) {
      next[key] = source[key];
    }
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(next));
    } catch (err) {}
    return next;
  }

  function formatConsoleTimestamp(value) {
    var time = new Date(Number(value || Date.now()) || Date.now());
    var hh = String(time.getHours()).padStart(2, "0");
    var mm = String(time.getMinutes()).padStart(2, "0");
    var ss = String(time.getSeconds()).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  }

  function emitConsoleLog(level, tag, text, extra) {
    if (!runtimeState || !runtimeState.config || !runtimeState.config.consoleLogging) {
      return;
    }
    if ("undefined" == typeof console) {
      return;
    }
    var method =
      "error" === String(level || "")
        ? "error"
        : "warn" === String(level || "")
          ? "warn"
          : "log";
    var prefix =
      "[SFS2X_OFFLINE][" +
      formatConsoleTimestamp(Date.now()) +
      "][" +
      String(tag || "LOG") +
      "]";
    if (void 0 !== extra) {
      console[method](prefix + "\n" + String(text || ""), extra);
      return;
    }
    console[method](prefix + "\n" + String(text || ""));
  }

  function buildPlatformWaterLogText(profile) {
    var data = pickObject(profile);
    if (!data.label) {
      return "";
    }
    return [
      "放水判断: " +
        String(data.label || "-") +
        " / 分 " +
        String(Number(data.score || 0) || 0) +
        " / 样本 " +
        String(Number(data.sampleCount || 0) || 0),
      "放水信号: peer命中 " +
        formatAmountValue((Number(data.peerHitRate || 0) || 0) * 100) +
        "% / peer净回报 " +
        formatAmountValue((Number(data.peerNetRatio || 0) || 0) * 100) +
        "% / self净回报 " +
        formatAmountValue((Number(data.selfNetRatio || 0) || 0) * 100) +
        "% / 放水机制 " +
        formatAmountValue((Number(data.highMechanismRate || 0) || 0) * 100) +
        "% / 吃分机制 " +
        formatAmountValue((Number(data.drainMechanismRate || 0) || 0) * 100) +
        "%",
      "放水构成: 特效 " +
        formatAmountValue((Number(data.openFeatureRate || 0) || 0) * 100) +
        "% / 特效命中 " +
        formatAmountValue((Number(data.openFeatureHitRate || 0) || 0) * 100) +
        "% / 高赔率 " +
        formatAmountValue((Number(data.highOddRate || 0) || 0) * 100) +
        "% / 奖池活跃 " +
        formatAmountValue((Number(data.poolFlagRate || 0) || 0) * 100) +
        "%",
      "放水对齐: mode1占比 " +
        formatAmountValue((Number(data.peerDesiredModeRate || 0) || 0) * 100) +
        "% / 可打样本 " +
        String(Number(data.peerUsableSampleCount || 0) || 0) +
        " / 可打净回报 " +
        formatAmountValue((Number(data.peerUsableNetRatio || 0) || 0) * 100) +
        "% / 错配惩罚 " +
        formatAmountValue(Number(data.componentScores && data.componentScores.peerAlignmentPenalty || 0) || 0),
    ].join("\n");
  }

  function logPlatformWaterProfileToConsole(profile) {
    var data = pickObject(profile);
    if (!data.label) {
      return;
    }
    var signature = [
      String(data.level || ""),
      String(Number(data.score || 0) || 0),
      String(Number(data.sampleCount || 0) || 0),
      String(Math.round((Number(data.peerHitRate || 0) || 0) * 1000)),
      String(Math.round((Number(data.highMechanismRate || 0) || 0) * 1000)),
    ].join("|");
    if (runtimeState.lastConsolePlatformWaterSignature === signature) {
      return;
    }
    runtimeState.lastConsolePlatformWaterSignature = signature;
    var text = buildPlatformWaterLogText(data);
    emitConsoleLog("log", "WATER", text);
    enqueueRemoteLog("WATER", "log", text, data);
  }

  function logDecisionToConsole(decision) {
    var data = pickObject(decision);
    if (!data.type) {
      return;
    }
    var level =
      "stop_loss_triggered" === String(data.type || "") || "error" === String(data.type || "")
        ? "error"
        : "risk_cooldown" === String(data.type || "") || "leave_room" === String(data.type || "")
          ? "warn"
          : "log";
    var text = formatDecisionText(data);
    emitConsoleLog(level, "DECISION", text);
    enqueueRemoteLog("DECISION", level, text, data);
  }

  function logResolvedOutcomeToConsole(outcome) {
    var data = pickObject(outcome);
    if (!(Number(data.resolvedAt || 0) > 0)) {
      return;
    }
    if (runtimeState.lastConsoleResolvedShotId === Number(data.shotId || 0)) {
      return;
    }
    runtimeState.lastConsoleResolvedShotId = Number(data.shotId || 0) || 0;
    var text =
      "最近结算: " +
      ("hit" === String(data.outcome || "") ? "命中" : "未中") +
      " / shot=" +
      String(Number(data.shotId || 0) || 0) +
      " / targetId=" +
      String(Number(data.targetId || 0) || 0) +
      " / sn=" +
      String(Number(data.targetSN || 0) || 0) +
      " / win " +
      formatMoneyFromRaw(data.totalWinRaw || 0) +
      " / bet " +
      formatMoneyFromRaw(data.betRaw || 0) +
      " / mechanism " +
      String(data.mechanismType || "-");
    emitConsoleLog("log", "RESULT", text);
    enqueueRemoteLog("RESULT", "log", text, data);
  }

  function logPendingFireToConsole(pending) {
    var data = pickObject(pending);
    if (!(Number(data.shotId || 0) > 0) || data.resolved) {
      return;
    }
    var mechanismHint = String(data.mechanismHintType || "");
    var mechanismLabel = String(data.mechanismHintLabel || "");
    var text =
      "发射审计: 待回执" +
      " / shot=" +
      String(Number(data.shotId || 0) || 0) +
      " / targetId=" +
      String(Number(data.targetId || 0) || 0) +
      " / sn=" +
      String(Number(data.targetSN || 0) || 0) +
      " / bet " +
      formatMoneyFromRaw(data.betRaw || 0) +
      " / hit " +
      String(Number(data.hitProbability || 0) || 0) +
      " / score " +
      String(Number(data.candidateScore || 0) || 0) +
      " / mechHint " +
      (mechanismHint ? mechanismHint : "-") +
      (mechanismLabel ? " " + mechanismLabel : "");
    emitConsoleLog("log", "SHOT", text);
    enqueueRemoteLog("SHOT", "log", text, data);
  }

  function hasOwn(obj, key) {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function parseJsonObjectSafe(value) {
    if (value && "object" == typeof value) {
      return value;
    }
    if ("string" != typeof value || !value) {
      return null;
    }
    try {
      var parsed = JSON.parse(value);
      return parsed && "object" == typeof parsed ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function getFacade() {
    if ("undefined" == typeof puremvc || !puremvc.Facade) {
      return null;
    }
    try {
      return puremvc.Facade.getInstance();
    } catch (err) {
      return null;
    }
  }

  function retrieveProxy(ctor) {
    if (!ctor || !ctor.NAME) {
      return null;
    }
    var facade = getFacade();
    if (!facade || "function" != typeof facade.retrieveProxy) {
      return null;
    }
    try {
      return facade.retrieveProxy(ctor.NAME) || null;
    } catch (err) {
      return null;
    }
  }

  function getAttackModeProxyInstance() {
    if ("undefined" == typeof AttackModeProxy) {
      return null;
    }
    if ("function" == typeof AttackModeProxy.getInstance) {
      try {
        return AttackModeProxy.getInstance();
      } catch (err) {}
    }
    return retrieveProxy(AttackModeProxy);
  }

  function getAttackControlProxyInstance() {
    if ("undefined" == typeof AttackControlProxy) {
      return null;
    }
    if ("function" == typeof AttackControlProxy.getInstance) {
      try {
        return AttackControlProxy.getInstance();
      } catch (err) {}
    }
    return retrieveProxy(AttackControlProxy);
  }

  function getSmartFoxProxyInstance() {
    if ("undefined" == typeof SmartFoxProxy) {
      return null;
    }
    return retrieveProxy(SmartFoxProxy);
  }

  function getSmartFoxInstance() {
    var proxy = getSmartFoxProxyInstance();
    return proxy && proxy.sfs ? proxy.sfs : null;
  }

  function getBattleOptionProxyInstance() {
    if ("undefined" == typeof BattleOptionProxy) {
      return null;
    }
    return retrieveProxy(BattleOptionProxy);
  }

  function getFortProxyInstance() {
    if ("undefined" == typeof FortProxy) {
      return null;
    }
    return retrieveProxy(FortProxy);
  }

  function getSelfSeatData() {
    try {
      if ("undefined" == typeof SeatProxy || "function" != typeof SeatProxy.getInstance) {
        return null;
      }
      var seatProxy = SeatProxy.getInstance();
      if (!seatProxy || "function" != typeof seatProxy.getSelfSeatData) {
        return null;
      }
      return seatProxy.getSelfSeatData() || null;
    } catch (err) {
      return null;
    }
  }

  function getSelfBetRuntime() {
    try {
      if ("undefined" == typeof SeatProxy || "function" != typeof SeatProxy.getInstance) {
        return {
          available: false,
          currentBetCent: 0,
          currentBetLevel: null,
          currentCannonIndex: null,
          currentPaolevel: 0,
          currentBetRatio: 0,
          baseBetCent: 0,
          betCentSteps: [],
        };
      }
      var seatProxy = SeatProxy.getInstance();
      var selfSeat =
        seatProxy && "function" == typeof seatProxy.getSelfSeatData
          ? seatProxy.getSelfSeatData()
          : null;
      if (!selfSeat || "object" != typeof selfSeat) {
        return {
          available: false,
          currentBetCent: 0,
          currentBetLevel: null,
          currentCannonIndex: null,
          currentPaolevel: 0,
          currentBetRatio: 0,
          baseBetCent: 0,
          betCentSteps: [],
        };
      }
      var currentBetCent = Number(selfSeat.betCent || 0) || 0;
      var currentBetLevel = null;
      if (hasOwn(selfSeat, "betLevel")) {
        var levelValue = Number(selfSeat.betLevel);
        if (isFinite(levelValue)) {
          currentBetLevel = Math.max(Math.trunc(levelValue), 0);
        }
      }
      if (
        null === currentBetLevel &&
        seatProxy &&
        "function" == typeof seatProxy.getBetLevel &&
        currentBetCent > 0
      ) {
        var fallbackLevel = Number(seatProxy.getBetLevel(currentBetCent));
        if (isFinite(fallbackLevel)) {
          currentBetLevel = Math.max(Math.trunc(fallbackLevel), 0);
        }
      }
      var baseBetCent = 0;
      var betCentSteps = [];
      var betCentArray =
        seatProxy && "function" == typeof seatProxy.getBetCentArray
          ? seatProxy.getBetCentArray()
          : [];
      if (Array.isArray(betCentArray)) {
        for (var i = 0; i < betCentArray.length; i++) {
          var item = Number(betCentArray[i] || 0) || 0;
          if (item > 0) {
            betCentSteps.push(item);
            if (!baseBetCent) {
              baseBetCent = item;
            }
          }
        }
      }
      if (!baseBetCent && currentBetCent > 0) {
        baseBetCent = currentBetCent;
      }
      var currentCannonIndex =
        null == currentBetLevel ? null : Math.max(Number(currentBetLevel || 0) + 1, 1);
      if (!(currentCannonIndex > 0) && currentBetCent > 0 && betCentSteps.length) {
        var matchedIndex = -1;
        var nearestIndex = -1;
        var nearestDistance = Number.POSITIVE_INFINITY;
        for (var j = 0; j < betCentSteps.length; j++) {
          var betCentStep = Number(betCentSteps[j] || 0) || 0;
          if (!(betCentStep > 0)) {
            continue;
          }
          if (betCentStep === currentBetCent) {
            matchedIndex = j;
            break;
          }
          var distance = Math.abs(betCentStep - currentBetCent);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = j;
          }
        }
        currentCannonIndex =
          matchedIndex >= 0 ? matchedIndex + 1 : nearestIndex >= 0 ? nearestIndex + 1 : null;
      }
      var currentBetRatio =
        baseBetCent > 0 && currentBetCent > 0
          ? Math.round((currentBetCent / baseBetCent) * 1000) / 1000
          : 0;
      return {
        available: true,
        currentBetCent: currentBetCent,
        currentBetLevel: currentBetLevel,
        currentCannonIndex: currentCannonIndex,
        currentPaolevel: currentCannonIndex > 0 ? currentCannonIndex : 0,
        currentBetRatio: currentBetRatio,
        baseBetCent: baseBetCent,
        betCentSteps: betCentSteps.slice(),
      };
    } catch (err) {
      return {
        available: false,
        currentBetCent: 0,
        currentBetLevel: null,
        currentCannonIndex: null,
        currentPaolevel: 0,
        currentBetRatio: 0,
        baseBetCent: 0,
        betCentSteps: [],
      };
    }
  }

  function getSelfPlayerRuntime() {
    try {
      var selfSeat = getSelfSeatData();
      var currentBalance = 0;
      var rawPlayerID = 0;
      var frameBalanceAvailable = false;
      var usedFallbackBalance = false;
      var balanceSource = "";
      if (selfSeat && "object" == typeof selfSeat) {
        rawPlayerID = Number(selfSeat.playerID || selfSeat.playerId || 0) || 0;
        if ("function" == typeof selfSeat.getClientCreditCent) {
          currentBalance = Number(selfSeat.getClientCreditCent() || 0) || 0;
          if (currentBalance > 0) {
            balanceSource = "selfSeat.getClientCreditCent";
          }
        }
        if (!(currentBalance > 0) && "function" == typeof selfSeat.getClientCreditCentByLog) {
          currentBalance = Number(selfSeat.getClientCreditCentByLog() || 0) || 0;
          if (currentBalance > 0) {
            balanceSource = "selfSeat.getClientCreditCentByLog";
          }
        }
        if (!(currentBalance > 0)) {
          currentBalance =
            Number(
              selfSeat.creditBalance ||
                selfSeat.serverCreditCent ||
                selfSeat.balance ||
                selfSeat.gold ||
                selfSeat.coin ||
                selfSeat.credit ||
                0
            ) || 0;
          if (currentBalance > 0) {
            balanceSource = "selfSeat.fields";
          }
        }
      }
      if (!(currentBalance > 0) || !(rawPlayerID > 0)) {
        try {
          if ("undefined" != typeof SeatProxy && "function" == typeof SeatProxy.getInstance) {
            var seatProxy = SeatProxy.getInstance();
            var seatList =
              seatProxy && "function" == typeof seatProxy.getSeatInfoDataArray
                ? seatProxy.getSeatInfoDataArray()
                : [];
            var selfSeatID = Number(seatProxy && seatProxy.selfSeatID || 0) || 0;
            var fallbackSeat = Array.isArray(seatList) ? seatList[selfSeatID] : null;
            if (fallbackSeat && "object" == typeof fallbackSeat) {
              if (!(rawPlayerID > 0)) {
                rawPlayerID =
                  Number(fallbackSeat.playerID || fallbackSeat.playerId || 0) || 0;
              }
              if (!(currentBalance > 0) && "function" == typeof fallbackSeat.getClientCreditCent) {
                currentBalance = Number(fallbackSeat.getClientCreditCent() || 0) || 0;
              }
              if (
                !(currentBalance > 0) &&
                "function" == typeof fallbackSeat.getClientCreditCentByLog
              ) {
                currentBalance =
                  Number(fallbackSeat.getClientCreditCentByLog() || 0) || 0;
              }
              if (!(currentBalance > 0)) {
                currentBalance =
                  Number(
                    fallbackSeat.creditBalance ||
                      fallbackSeat.serverCreditCent ||
                      fallbackSeat.balance ||
                      0
                  ) || 0;
                if (currentBalance > 0) {
                  balanceSource = "seatList.fields";
                }
              }
              if (!(balanceSource) && currentBalance > 0) {
                balanceSource = "seatList";
              }
            }
          }
        } catch (err) {}
      }
      frameBalanceAvailable = currentBalance > 0;
      if (frameBalanceAvailable) {
        if ("object" == typeof runtimeState && runtimeState) {
          runtimeState.lastKnownBalance = currentBalance;
          runtimeState.lastKnownBalanceAt = Date.now();
        }
      } else if (
        "object" == typeof runtimeState &&
        runtimeState &&
        Number(runtimeState.lastKnownBalance || 0) > 0
      ) {
        currentBalance = Number(runtimeState.lastKnownBalance || 0) || 0;
        usedFallbackBalance = true;
        balanceSource = "runtimeState.lastKnownBalance";
      }
      if (!(selfSeat && "object" == typeof selfSeat) && !(rawPlayerID > 0) && !(currentBalance > 0)) {
        return {
          available: false,
          playerId: "",
          playerID: 0,
          currentBalance: 0,
          creditBalance: 0,
          balanceAvailable: false,
          usedFallbackBalance: false,
          balanceSource: "",
        };
      }
      return {
        available: !!(rawPlayerID > 0 || currentBalance > 0),
        playerId: rawPlayerID > 0 ? String(rawPlayerID) : "",
        playerID: rawPlayerID,
        currentBalance: currentBalance,
        creditBalance: currentBalance,
        balanceAvailable: !!frameBalanceAvailable,
        usedFallbackBalance: !!usedFallbackBalance,
        balanceSource: String(balanceSource || ""),
      };
    } catch (err) {
      return {
        available: false,
        playerId: "",
        playerID: 0,
        currentBalance: 0,
        creditBalance: 0,
        balanceAvailable: false,
        usedFallbackBalance: false,
        balanceSource: "",
      };
    }
  }

  function trimPendingFireOutcomes(state) {
    var list = Array.isArray(state && state.pendingFireOutcomes) ? state.pendingFireOutcomes : [];
    var now = Date.now();
    var pendingTimeoutMs = Math.max(
      toInt(state && state.config ? state.config.pendingFireOutcomeTimeoutMs : 2800, 2800),
      800
    );
    var kept = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item || "object" != typeof item) {
        continue;
      }
      if (!item.resolved && now - (Number(item.firedAt || 0) || 0) > pendingTimeoutMs) {
        item.resolved = true;
        item.resolvedAt = now;
        item.outcome = "timeout";
        item.auditSource = "timeout_without_sync";
        recordFireAudit(state, "native_fire_leak", {
          source: "timeout_without_sync",
          shotId: Number(item.shotId || 0) || 0,
          expectedTargetId: Number(item.targetId || 0) || 0,
          expectedTargetSN: Number(item.targetSN || 0) || 0,
          fireMethod: String(item.fireMethod || ""),
          waitMs: now - (Number(item.firedAt || 0) || 0),
        });
        kept.push(item);
        continue;
      }
      if (!item.resolved && now - (Number(item.firedAt || 0) || 0) <= pendingTimeoutMs) {
        kept.push(item);
        continue;
      }
      if (item.resolved && now - (Number(item.resolvedAt || 0) || 0) <= 5000) {
        kept.push(item);
      }
    }
    state.pendingFireOutcomes = kept.slice(-12);
    return state.pendingFireOutcomes;
  }

  function getLatestPendingFireOutcome(state) {
    var list = trimPendingFireOutcomes(state);
    for (var i = list.length - 1; i >= 0; i--) {
      var item = list[i];
      if (item && !item.resolved) {
        return cloneObject(item);
      }
    }
    return null;
  }

  function getActivePendingFireCount(state) {
    var list = trimPendingFireOutcomes(state);
    var count = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && !list[i].resolved) {
        count += 1;
      }
    }
    return count;
  }

  function trimRecentSyncOutcomes(state) {
    var list = Array.isArray(state && state.recentSyncOutcomes) ? state.recentSyncOutcomes : [];
    var windowMs =
      Math.max(
        toInt(state && state.config ? state.config.platformWaterWindowSeconds : 120, 120),
        30
      ) * 1000;
    var maxRecords = Math.max(
      toInt(state && state.config ? state.config.platformWaterMaxRecords : 320, 320),
      60
    );
    var now = Date.now();
    var kept = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item || "object" != typeof item) {
        continue;
      }
      if (now - (Number(item.ts || 0) || 0) <= windowMs) {
        kept.push(item);
      }
    }
    state.recentSyncOutcomes = kept.slice(-maxRecords);
    return state.recentSyncOutcomes;
  }

  function recordRecentSyncOutcome(state, syncOutcome) {
    if (!state || !syncOutcome) {
      return null;
    }
    if (!Array.isArray(state.recentSyncOutcomes)) {
      state.recentSyncOutcomes = [];
    }
    state.recentSyncOutcomes.push({
      ts: Date.now(),
      playerID: Number(syncOutcome.playerID || 0) || 0,
      targetSN: Number(syncOutcome.targetSN || 0) || 0,
      targetId: Number(syncOutcome.targetId || 0) || 0,
      totalWinRaw: Number(syncOutcome.totalWinRaw || 0) || 0,
      betRaw: Number(syncOutcome.betRaw || 0) || 0,
      killCount: Number(syncOutcome.killCount || 0) || 0,
      mechanismType: String(syncOutcome.mechanismType || ""),
      oddRaw: Number(syncOutcome.oddRaw || 0) || 0,
      fireModeId: Number(syncOutcome.fireModeId || 0) || 0,
      poolFlag: !!syncOutcome.poolFlag,
      specialFeatureTypes: cloneArray(syncOutcome.specialFeatureTypes || []),
    });
    trimRecentSyncOutcomes(state);
    return state.recentSyncOutcomes;
  }

  function syncLatestFireAuditToDecision(state) {
    if (!state || !state.lastDecision || "object" != typeof state.lastDecision) {
      return;
    }
    state.lastDecision.lastFireAudit = cloneObject(state.lastFireAudit);
    state.lastDecision.nativeFireLeakCount = Number(state.nativeFireLeakCount || 0) || 0;
    state.lastDecision.nativeContinuousFireCount =
      Number(state.nativeContinuousFireCount || 0) || 0;
    state.lastDecision.targetBindingMismatchCount =
      Number(state.targetBindingMismatchCount || 0) || 0;
  }

  function recordFireAudit(state, type, payload) {
    if (!state || !type) {
      return null;
    }
    var now = Date.now();
    var audit = cloneObject(payload);
    audit.type = String(type || "");
    audit.ts = now;
    state.lastFireAudit = audit;
    if ("native_fire_leak" === audit.type) {
      state.nativeFireLeakCount = (Number(state.nativeFireLeakCount || 0) || 0) + 1;
    } else if (
      "native_continuous_fire_active" === audit.type ||
      "native_attack_mode_drift" === audit.type
    ) {
      state.nativeContinuousFireCount =
        (Number(state.nativeContinuousFireCount || 0) || 0) + 1;
    } else if ("target_binding_mismatch" === audit.type) {
      state.targetBindingMismatchCount =
        (Number(state.targetBindingMismatchCount || 0) || 0) + 1;
    }
    syncLatestFireAuditToDecision(state);
    return audit;
  }

  function calcOutcomeHitRate(list) {
    if (!Array.isArray(list) || !list.length) {
      return 0;
    }
    var hitCount = 0;
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if ((Number(item.killCount || 0) || 0) > 0 || (Number(item.totalWinRaw || 0) || 0) > 0) {
        hitCount += 1;
      }
    }
    return hitCount / list.length;
  }

  function calcOutcomeNetRatio(list) {
    if (!Array.isArray(list) || !list.length) {
      return 0;
    }
    var totalBet = 0;
    var totalNet = 0;
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var betRaw = Number(item.betRaw || 0) || 0;
      var totalWinRaw = Number(item.totalWinRaw || 0) || 0;
      totalBet += betRaw;
      totalNet += totalWinRaw - betRaw;
    }
    return totalBet > 0 ? totalNet / totalBet : 0;
  }

  function isDesiredAttackModeOutcome(item, desiredModeId) {
    var modeId = Number(item && item.fireModeId || 0) || 0;
    var targetModeId = Number(desiredModeId || 0) || 0;
    return targetModeId > 0 && modeId === targetModeId;
  }

  function isUsablePrecisionTargetOutcome(config, item) {
    var targetId = Number(item && item.targetId || 0) || 0;
    return isWhitelistPrecisionTier(getPrecisionTargetTier(config, targetId));
  }

  function getPlatformUsablePeerNetRatio(profile) {
    var data = pickObject(profile);
    if ((Number(data.peerUsableSampleCount || 0) || 0) > 0) {
      return Number(data.peerUsableNetRatio || 0) || 0;
    }
    if ((Number(data.peerDesiredModeSampleCount || 0) || 0) > 0) {
      return Number(data.peerDesiredModeNetRatio || 0) || 0;
    }
    return Number(data.peerNetRatio || 0) || 0;
  }

  function shouldBypassEmptyOddsWhitelist(profile, candidate, scoreInfo) {
    var data = pickObject(profile);
    var item = pickObject(candidate);
    var score = pickObject(scoreInfo);
    var tier = String(score.tier || "");
    if ("blacklist" === tier || "invalid" === tier) {
      return false;
    }
    if (isWhitelistPrecisionTier(tier)) {
      return true;
    }
    return !!(
      (Number(data.peerDesiredModeRate || 0) || 0) >= 0.2 &&
      (Number(data.peerNetRatio || 0) || 0) > 0 &&
      Number(score.hitProbability || 0) >= 97 &&
      Number(score.score || 0) >= 90 &&
      item &&
      item.node
    );
  }

  function calcPredicateRate(list, predicate) {
    if (!Array.isArray(list) || !list.length || "function" != typeof predicate) {
      return 0;
    }
    var matched = 0;
    for (var i = 0; i < list.length; i++) {
      if (predicate(list[i])) {
        matched += 1;
      }
    }
    return matched / list.length;
  }

  function hasOpenSpecialFeature(item) {
    var list = Array.isArray(item && item.specialFeatureTypes) ? item.specialFeatureTypes : [];
    for (var i = 0; i < list.length; i++) {
      var type = String(list[i] || "");
      if (
        "SF_37" === type ||
        "SF_39" === type ||
        "SF_35" === type ||
        "SF_34" === type ||
        "SF_15" === type
      ) {
        return true;
      }
    }
    return false;
  }

  var MECHANISM_TYPE_PROFILE_MAP = {
    MN_043: {
      label: "放水",
      nature: "water",
      tone: "good",
      hitRateText: "10.36%",
      rtpText: "111.6%",
      desc: "放水（玩家赢）",
    },
    MN_047: {
      label: "放水",
      nature: "water",
      tone: "good",
      hitRateText: "9.35%",
      rtpText: "116.0%",
      desc: "放水（玩家赢）",
    },
    MN_048: {
      label: "吃分",
      nature: "drain",
      tone: "warn",
      hitRateText: "0.76%",
      rtpText: "41.6%",
      desc: "吃分",
    },
    MN_046: {
      label: "吃分",
      nature: "drain",
      tone: "warn",
      hitRateText: "0.77%",
      rtpText: "54.2%",
      desc: "吃分",
    },
    MN_045: {
      label: "重吃分",
      nature: "drain_heavy",
      tone: "danger",
      hitRateText: "1.86%",
      rtpText: "16.4%",
      desc: "重吃分",
    },
    MN_044: {
      label: "奖励",
      nature: "reward",
      tone: "good",
      hitRateText: "100%",
      rtpText: "∞",
      desc: "头奖/奖励",
    },
  };

  function getMechanismTypeProfile(mechanismType) {
    var code = String(mechanismType || "").trim();
    var profile = code ? pickObject(MECHANISM_TYPE_PROFILE_MAP[code]) : null;
    if (profile && profile.label) {
      return {
        mechanismType: code,
        label: String(profile.label || ""),
        nature: String(profile.nature || "unknown"),
        tone: String(profile.tone || "accent"),
        hitRateText: String(profile.hitRateText || "-"),
        rtpText: String(profile.rtpText || "-"),
        desc: String(profile.desc || ""),
      };
    }
    return {
      mechanismType: code,
      label: code ? "未知机制" : "未识别",
      nature: code ? "unknown" : "none",
      tone: "accent",
      hitRateText: "-",
      rtpText: "-",
      desc: code ? "未建档机制" : "暂无机制样本",
    };
  }

  function isDrainMechanismNature(nature) {
    var value = String(nature || "");
    return "drain" === value || "drain_heavy" === value;
  }

  function isPositiveWaterMechanismNature(nature) {
    var value = String(nature || "");
    return "water" === value || "reward" === value;
  }

  function getAttackModeIdFromProxy(attackProxy) {
    var proxy = attackProxy || getAttackModeProxyInstance();
    if (!proxy) {
      return 0;
    }
    if ("function" == typeof proxy.getAttackMode) {
      return Number(proxy.getAttackMode()) || 0;
    }
    if (
      proxy.strategy &&
      proxy.strategy.tableEntity &&
      void 0 !== proxy.strategy.tableEntity.id
    ) {
      return Number(proxy.strategy.tableEntity.id) || 0;
    }
    return 0;
  }

  function getAttackModeLabel(modeId) {
    var id = Number(modeId || 0) || 0;
    if (!(id > 0)) {
      return "unknown";
    }
    if (
      "undefined" != typeof AttackModeTableEnum &&
      void 0 !== AttackModeTableEnum[id]
    ) {
      return String(AttackModeTableEnum[id] || "mode_" + String(id));
    }
    if (1 === id) {
      return "OneFireByClickBG";
    }
    if (2 === id) {
      return "ContFireByClickSymbol";
    }
    if (132 === id) {
      return "X3ContFireByClickSymbol";
    }
    return "mode_" + String(id);
  }

  function isContinuousAttackModeId(modeId) {
    var id = Number(modeId || 0) || 0;
    return !!(
      2 === id ||
      3 === id ||
      10 === id ||
      12 === id ||
      132 === id
    );
  }

  function isUnexpectedNativeAttackModeId(modeId, desiredModeId) {
    var id = Number(modeId || 0) || 0;
    var expected = Number(desiredModeId || resolveAimAttackModeId()) || 0;
    return id > 0 && expected > 0 && id !== expected;
  }

  function getNativeAttackModeAuditType(modeId, desiredModeId) {
    var id = Number(modeId || 0) || 0;
    if (!isUnexpectedNativeAttackModeId(id, desiredModeId)) {
      return "";
    }
    return isContinuousAttackModeId(id)
      ? "native_continuous_fire_active"
      : "native_attack_mode_drift";
  }

  function refreshObservedAttackModeState(state, attackProxy) {
    if (!state || "object" != typeof state) {
      return 0;
    }
    var currentModeId = getAttackModeIdFromProxy(attackProxy);
    state.currentAttackModeId = currentModeId;
    state.currentAttackModeLabel = getAttackModeLabel(currentModeId);
    return currentModeId;
  }

  function shouldTreatNativeContinuousFireAsActive(state, config) {
    if (!state || "object" != typeof state) {
      return false;
    }
    var desiredModeId = resolveAimAttackModeId();
    var currentModeId = Number(state.currentAttackModeId || 0) || 0;
    var observedModeId = Number(state.lastObservedSelfFireModeId || 0) || 0;
    var now = Date.now();
    var recentWindowMs = Math.max(
      toInt(config && config.pendingFireOutcomeTimeoutMs, 2800),
      1200
    ) * 2;
    if (
      Number(state.lastObservedSelfFireAt || 0) > 0 &&
      now - (Number(state.lastObservedSelfFireAt || 0) || 0) <= recentWindowMs &&
      observedModeId > 0 &&
      isUnexpectedNativeAttackModeId(observedModeId, desiredModeId)
    ) {
      return true;
    }
    return isUnexpectedNativeAttackModeId(currentModeId, desiredModeId);
  }

  function buildActiveNativeContinuousFireAuditPayload(state, attackProxy) {
    var proxy = attackProxy || getAttackModeProxyInstance();
    var currentModeId = refreshObservedAttackModeState(state, proxy);
    var observedModeId = Number(state && state.lastObservedSelfFireModeId || 0) || 0;
    var activeModeId = observedModeId > 0 ? observedModeId : currentModeId;
    var desiredModeId = resolveAimAttackModeId();
    return {
      source: "self_sync_mode_drift",
      currentAttackModeId: currentModeId,
      currentAttackModeLabel: getAttackModeLabel(currentModeId),
      fireModeId: activeModeId,
      fireModeLabel: getAttackModeLabel(activeModeId),
      desiredModeId: desiredModeId,
      desiredModeLabel: getAttackModeLabel(desiredModeId),
      targetId: Number(state && state.lastObservedSelfFireTargetId || 0) || 0,
      targetSN: Number(state && state.lastObservedSelfFireTargetSN || 0) || 0,
      fireAt: Number(state && state.lastObservedSelfFireAt || 0) || 0,
      traceId: Number(state && state.lastObservedSelfFireTraceId || 0) || 0,
    };
  }

  function getNativeFireBlockDetail(attackProxy) {
    var proxy = attackProxy || getAttackModeProxyInstance();
    var detail = {
      code: "",
      label: "",
      remainBulletCount: 0,
      selfBulletSize: 0,
      bulletType: 0,
    };
    if (!proxy) {
      detail.code = "attack_proxy_missing";
      detail.label = "攻击代理缺失";
      return detail;
    }
    if (proxy.scMaintenanceAnnounce) {
      detail.code = "maintenance";
      detail.label = "维护公告中";
      return detail;
    }
    if (proxy.isInsufficientBalance) {
      detail.code = "insufficient_balance";
      detail.label = "余额不足";
      return detail;
    }
    var fortView = null;
    var bulletView = null;
    try {
      fortView =
        "undefined" != typeof FortProxy &&
        FortProxy &&
        "function" == typeof FortProxy.getInstance
          ? FortProxy.getInstance().getSelfFortViewObject()
          : null;
    } catch (err) {}
    if (!fortView) {
      detail.code = "self_fort_missing";
      detail.label = "炮台视图缺失";
      return detail;
    }
    if (fortView.isChangingFort) {
      detail.code = "changing_fort";
      detail.label = "炮台切换中";
      return detail;
    }
    var fortTableData =
      "function" == typeof fortView.getFortTableData ? fortView.getFortTableData() : null;
    var bulletType = Number(fortTableData && fortTableData.bulletType || 0) || 0;
    detail.bulletType = bulletType;
    try {
      bulletView =
        "undefined" != typeof BulletProxy &&
        BulletProxy &&
        "function" == typeof BulletProxy.getInstance
          ? BulletProxy.getInstance().getSelfBulletViewObject()
          : null;
    } catch (err) {}
    if (!bulletView) {
      detail.code = "self_bullet_missing";
      detail.label = "炮弹视图缺失";
      return detail;
    }
    if (
      "function" == typeof fortView.canBulletTypeFire &&
      !fortView.canBulletTypeFire(bulletType)
    ) {
      detail.code = "bullet_type_blocked";
      detail.label = "当前炮种不可发射";
      return detail;
    }
    if ("function" == typeof bulletView.getRemainBulletCount) {
      detail.remainBulletCount = Number(bulletView.getRemainBulletCount(bulletType) || 0) || 0;
    }
    if (detail.remainBulletCount <= 0) {
      detail.code = "no_bullet";
      detail.label = "剩余炮弹为 0";
      return detail;
    }
    try {
      detail.selfBulletSize =
        "undefined" != typeof BulletProxy &&
        BulletProxy &&
        "function" == typeof BulletProxy.getInstance
          ? Number(BulletProxy.getInstance().getSelfBulletSize() || 0) || 0
          : 0;
    } catch (err) {}
    if (detail.selfBulletSize >= 20) {
      detail.code = "bullet_queue_full";
      detail.label = "未结算炮弹过多";
      return detail;
    }
    detail.code = "unknown";
    detail.label = "原生拦截";
    return detail;
  }

  function trimRecentSelfResolvedOutcomes(state) {
    if (!state || !Array.isArray(state.recentSelfResolvedOutcomes)) {
      return [];
    }
    var maxCount = 10;
    if (state.recentSelfResolvedOutcomes.length > maxCount) {
      state.recentSelfResolvedOutcomes = state.recentSelfResolvedOutcomes.slice(
        state.recentSelfResolvedOutcomes.length - maxCount
      );
    }
    return state.recentSelfResolvedOutcomes.slice();
  }

  function recordRecentSelfResolvedOutcome(state, syncOutcome) {
    if (!state || !syncOutcome) {
      return;
    }
    if (!Array.isArray(state.recentSelfResolvedOutcomes)) {
      state.recentSelfResolvedOutcomes = [];
    }
    state.recentSelfResolvedOutcomes.push({
      ts: Date.now(),
      targetId: Number(syncOutcome.targetId || 0) || 0,
      targetSN: Number(syncOutcome.targetSN || 0) || 0,
      fireModeId: Number(syncOutcome.fireModeId || 0) || 0,
      fireModeLabel: getAttackModeLabel(syncOutcome.fireModeId),
      oddRaw: Number(syncOutcome.oddRaw || 0) || 0,
      mechanismType: String(syncOutcome.mechanismType || ""),
      totalWinRaw: Number(syncOutcome.totalWinRaw || 0) || 0,
      betRaw: Number(syncOutcome.betRaw || 0) || 0,
    });
    trimRecentSelfResolvedOutcomes(state);
  }

  function recordUntrackedSelfResolvedOutcome(state, syncOutcome) {
    if (!state || !syncOutcome) {
      return null;
    }
    state.untrackedSelfResolvedCount = (Number(state.untrackedSelfResolvedCount || 0) || 0) + 1;
    state.roomUntrackedSelfResolvedCount =
      (Number(state.roomUntrackedSelfResolvedCount || 0) || 0) + 1;
    state.lastUntrackedSelfResolvedOutcome = {
      ts: Date.now(),
      targetId: Number(syncOutcome.targetId || 0) || 0,
      targetSN: Number(syncOutcome.targetSN || 0) || 0,
      fireModeId: Number(syncOutcome.fireModeId || 0) || 0,
      fireModeLabel: getAttackModeLabel(syncOutcome.fireModeId),
      oddRaw: Number(syncOutcome.oddRaw || 0) || 0,
      mechanismType: String(syncOutcome.mechanismType || ""),
      totalWinRaw: Number(syncOutcome.totalWinRaw || 0) || 0,
      betRaw: Number(syncOutcome.betRaw || 0) || 0,
      traceId: Number(syncOutcome.traceId || 0) || 0,
      outcome:
        (Number(syncOutcome.killCount || 0) || 0) > 0 ||
        (Number(syncOutcome.totalWinRaw || 0) || 0) > 0
          ? "hit"
          : "miss",
    };
    return state.lastUntrackedSelfResolvedOutcome;
  }

  function formatRecentSelfResolvedSummary(list, maxCount) {
    var entries = Array.isArray(list) ? list : [];
    var count = Math.max(Number(maxCount || 0) || 0, 1);
    if (!entries.length) {
      return "-";
    }
    var start = Math.max(entries.length - count, 0);
    var parts = [];
    for (var i = start; i < entries.length; i++) {
      var item = entries[i];
      if (!item) {
        continue;
      }
      parts.push(
        String(item.fireModeLabel || getAttackModeLabel(item.fireModeId) || "unknown") +
          "/t" +
          String(Number(item.targetId || 0) || 0) +
          "/o" +
          String(Number(item.oddRaw || 0) || 0) +
          "/" +
          String(item.mechanismType || "-")
      );
    }
    return parts.length ? parts.join(" | ") : "-";
  }

  function buildSelfMechanismSummary(state) {
    var selfPlayerID = Number(getSelfPlayerRuntime().playerID || 0) || 0;
    var roomEnteredAt = Number(state && state.roomEnteredAt || 0) || 0;
    var recent = trimRecentSyncOutcomes(state);
    var selfList = [];
    var roomSelfList = [];
    for (var i = 0; i < recent.length; i++) {
      var item = recent[i];
      if (!item || !(Number(item.playerID || 0) > 0)) {
        continue;
      }
      if (selfPlayerID > 0 && Number(item.playerID || 0) !== selfPlayerID) {
        continue;
      }
      selfList.push(item);
      if (roomEnteredAt > 0 && (Number(item.ts || 0) || 0) >= roomEnteredAt) {
        roomSelfList.push(item);
      }
    }
    var activeList = roomSelfList.length ? roomSelfList : selfList;
    var latest = null;
    for (var j = activeList.length - 1; j >= 0; j--) {
      if (String(activeList[j] && activeList[j].mechanismType || "")) {
        latest = activeList[j];
        break;
      }
    }
    if (!latest) {
      var lastResolved = pickObject(state && state.lastResolvedFireOutcome);
      if (String(lastResolved.mechanismType || "")) {
        latest = {
          ts: Number(lastResolved.resolvedAt || lastResolved.firedAt || 0) || 0,
          mechanismType: String(lastResolved.mechanismType || ""),
          totalWinRaw: Number(lastResolved.totalWinRaw || 0) || 0,
          betRaw: Number(lastResolved.betRaw || 0) || 0,
          killCount: Number(lastResolved.killCount || 0) || 0,
        };
      }
    }
    var profile = getMechanismTypeProfile(latest && latest.mechanismType || "");
    if (!String(profile.mechanismType || "")) {
      return {
        mechanismType: "",
        label: String(profile.label || "未识别"),
        nature: String(profile.nature || "none"),
        tone: String(profile.tone || "accent"),
        hitRateText: String(profile.hitRateText || "-"),
        rtpText: String(profile.rtpText || "-"),
        desc: String(profile.desc || "暂无机制样本"),
        sourceText: "暂无",
        currentRoom: false,
        sampleCount: activeList.length,
        sameTypeCount: 0,
        recentNetRatio: 0,
        updatedAt: 0,
      };
    }
    var sameTypeCount = 0;
    var totalBet = 0;
    var totalWin = 0;
    for (var k = 0; k < activeList.length; k++) {
      var sample = activeList[k];
      if (!sample) {
        continue;
      }
      if (String(sample.mechanismType || "") === String(profile.mechanismType || "")) {
        sameTypeCount += 1;
      }
      totalBet += Number(sample.betRaw || 0) || 0;
      totalWin += Number(sample.totalWinRaw || 0) || 0;
    }
    return {
      mechanismType: String(profile.mechanismType || ""),
      label: String(profile.label || ""),
      nature: String(profile.nature || "unknown"),
      tone: String(profile.tone || "accent"),
      hitRateText: String(profile.hitRateText || "-"),
      rtpText: String(profile.rtpText || "-"),
      desc: String(profile.desc || ""),
      sourceText: roomSelfList.length ? "本房" : "近窗",
      currentRoom: !!roomSelfList.length,
      sampleCount: activeList.length,
      sameTypeCount: sameTypeCount,
      recentNetRatio: totalBet > 0 ? (totalWin - totalBet) / totalBet : 0,
      updatedAt: Number(latest && latest.ts || 0) || 0,
    };
  }

  function canAllowSelfLossStreakProbeBypass(analysis, state, config) {
    var runtimeState = state && "object" == typeof state ? state : null;
    var runtimeConfig = config && "object" == typeof config ? config : {};
    var waterActionGuard = buildPlatformWaterActionGuard(runtimeState, runtimeConfig);
    if (true !== runtimeConfig.enableSelfLossStreakProbeBypass) {
      return false;
    }
    if (waterActionGuard.hardBlocked) {
      return false;
    }
    var platformWaterProfile = pickObject(runtimeState && runtimeState.platformWaterProfile);
    var profitCandidate = analysis && analysis.profitCandidate ? analysis.profitCandidate : null;
    var profitScoreInfo = profitCandidate && profitCandidate.scoreInfo ? profitCandidate.scoreInfo : null;
    var profitTier = String(profitScoreInfo && profitScoreInfo.tier || "");
    var profitTargetId = Number(
      profitCandidate && (profitCandidate.tableEntityID || profitCandidate.symbolID || 0)
    ) || 0;
    var consecutiveMissShots = Math.max(toInt(runtimeState && runtimeState.consecutiveMissShots, 0), 0);
    var roomResolvedShotCount = Math.max(toInt(runtimeState && runtimeState.roomResolvedShotCount, 0), 0);
    var roomObservedSelfResolvedCount = Math.max(
      toInt(runtimeState && runtimeState.roomObservedSelfResolvedCount, 0),
      0
    );
    var roomUntrackedSelfResolvedCount = Math.max(
      toInt(runtimeState && runtimeState.roomUntrackedSelfResolvedCount, 0),
      0
    );
    var effectiveResolvedShotCount = Math.max(
      roomResolvedShotCount,
      roomObservedSelfResolvedCount,
      roomUntrackedSelfResolvedCount
    );
    var roomProfitRaw = toNumber(runtimeState && runtimeState.roomProfitRaw, 0);
    var platformWaterLevel = String(platformWaterProfile.level || "");
    var usablePeerNetRatio = getPlatformUsablePeerNetRatio(platformWaterProfile);
    var desiredModeRate = Number(platformWaterProfile.peerDesiredModeRate || 0) || 0;
    var usableSampleCount = Number(platformWaterProfile.peerUsableSampleCount || 0) || 0;
    var stableTicks =
      Number(
        profitScoreInfo &&
          profitScoreInfo.captureStats &&
          profitScoreInfo.captureStats.consecutiveSeenTicks || 0
      ) || 0;
    var profitScoreValue = Number(
      analysis && (analysis.profitScore || 0)
    ) || 0;
    if (!(profitScoreValue > 0)) {
      profitScoreValue = Number(
        profitScoreInfo &&
          (profitScoreInfo.score ||
            (profitScoreInfo.captureStats && profitScoreInfo.captureStats.score) ||
            0)
      ) || 0;
    }
    var profitHitProbabilityValue = Number(
      analysis && (analysis.profitHitProbability || 0)
    ) || 0;
    if (!(profitHitProbabilityValue > 0)) {
      profitHitProbabilityValue = Number(
        profitScoreInfo &&
          (profitScoreInfo.hitProbability ||
            (profitScoreInfo.captureStats && profitScoreInfo.captureStats.hitProbability) ||
            0)
      ) || 0;
    }
    if (consecutiveMissShots < 2) {
      return false;
    }
    if (!profitCandidate || !analysis || !analysis.profitCandidateReady) {
      return false;
    }
    if ("primary" !== profitTier) {
      return false;
    }
    var precisionProbeTargetIds = Array.isArray(runtimeConfig.selfLossStreakPrecisionProbeTargetIds)
      ? runtimeConfig.selfLossStreakPrecisionProbeTargetIds
      : [2, 3, 19];
    if (
      includesNumber([2, 3, 19], profitTargetId) &&
      consecutiveMissShots <= 2 &&
      profitScoreValue >= 150 &&
      profitHitProbabilityValue >= 98 &&
      stableTicks >= 6 &&
      roomProfitRaw >= -0.25
    ) {
      return true;
    }
    if (
      precisionProbeTargetIds.indexOf(profitTargetId) >= 0 &&
      consecutiveMissShots <=
        Math.max(toInt(runtimeConfig.selfLossStreakPrecisionProbeMaxMissShots, 2), 2) &&
      profitScoreValue >=
        Math.max(toNumber(runtimeConfig.selfLossStreakPrecisionProbeMinCandidateScore, 150), 1) &&
      profitHitProbabilityValue >=
        Math.max(toNumber(runtimeConfig.selfLossStreakPrecisionProbeMinHitProbability, 98), 1) &&
      stableTicks >=
        Math.max(toInt(runtimeConfig.selfLossStreakPrecisionProbeMinStableSeenTicks, 10), 1) &&
      roomProfitRaw >=
        -Math.max(toNumber(runtimeConfig.selfLossStreakPrecisionProbeMaxRoomLossRaw, 0.25), 0)
    ) {
      return true;
    }
    if (effectiveResolvedShotCount < consecutiveMissShots) {
      return false;
    }
    if ("warming" !== platformWaterLevel && "open_suspected" !== platformWaterLevel) {
      if (
        desiredModeRate <
          clamp(toNumber(runtimeConfig.selfLossStreakContinuationMinModeRate, 0.2), 0, 1) ||
        usableSampleCount <
          Math.max(toInt(runtimeConfig.selfLossStreakContinuationMinUsableSamples, 12), 1) ||
        consecutiveMissShots >
          Math.max(toInt(runtimeConfig.selfLossStreakContinuationMaxMissShots, 3), 2)
      ) {
        return false;
      }
    }
    if (
      (Number(platformWaterProfile.score || 0) || 0) <
        Math.max(toNumber(runtimeConfig.selfLossStreakProbeMinWaterScore, 46), 1) ||
      usablePeerNetRatio <
        clamp(toNumber(runtimeConfig.selfLossStreakProbeMinPeerNetRatio, 0.15), -1, 5) ||
      (Number(platformWaterProfile.highOddRate || 0) || 0) <
        clamp(toNumber(runtimeConfig.selfLossStreakProbeMinHighOddRate, 0.2), 0, 1)
    ) {
      return false;
    }
    if (
      (Number(analysis.profitScore || 0) || 0) <
        Math.max(
          toNumber(
            "warming" === platformWaterLevel || "open_suspected" === platformWaterLevel
              ? runtimeConfig.selfLossStreakProbeMinCandidateScore
              : runtimeConfig.selfLossStreakContinuationMinCandidateScore,
            "warming" === platformWaterLevel || "open_suspected" === platformWaterLevel ? 140 : 96
          ),
          1
        ) ||
      (Number(analysis.profitHitProbability || 0) || 0) <
        Math.max(
          toNumber(
            "warming" === platformWaterLevel || "open_suspected" === platformWaterLevel
              ? runtimeConfig.selfLossStreakProbeMinHitProbability
              : runtimeConfig.selfLossStreakContinuationMinHitProbability,
            "warming" === platformWaterLevel || "open_suspected" === platformWaterLevel ? 98 : 97
          ),
          1
        )
    ) {
      return false;
    }
    if (
      stableTicks <
      Math.max(
        toInt(
          "warming" === platformWaterLevel || "open_suspected" === platformWaterLevel
            ? runtimeConfig.selfLossStreakProbeMinStableSeenTicks
            : runtimeConfig.selfLossStreakContinuationMinStableSeenTicks,
          4
        ),
        1
      )
    ) {
      return false;
    }
    return roomProfitRaw >= -Math.max(
      toNumber(
        "warming" === platformWaterLevel || "open_suspected" === platformWaterLevel
          ? runtimeConfig.selfLossStreakProbeMaxRoomLossRaw
          : runtimeConfig.selfLossStreakContinuationMaxRoomLossRaw,
        "warming" === platformWaterLevel || "open_suspected" === platformWaterLevel ? 0.35 : 0.45
      ),
      0
    );
  }

  function shouldBlockBySelfMechanism(state, mechanismSummary) {
    var summary = pickObject(mechanismSummary);
    if (!summary.currentRoom || !String(summary.mechanismType || "")) {
      return false;
    }
    var nature = String(summary.nature || "");
    var roomProfitRaw = Number(state && state.roomProfitRaw || 0) || 0;
    var consecutiveMissShots = Number(state && state.consecutiveMissShots || 0) || 0;
    if ("drain_heavy" === nature) {
      return true;
    }
    if (!isDrainMechanismNature(nature)) {
      return false;
    }
    return consecutiveMissShots > 0 || roomProfitRaw < 0;
  }

  function buildPlatformWaterActionGuard(state, config) {
    var profile = pickObject(state && state.platformWaterProfile);
    var recentList = Array.isArray(state && state.recentSelfResolvedOutcomes)
      ? state.recentSelfResolvedOutcomes.slice()
      : [];
    var recentWindow = Math.max(
      toInt(config && config.platformDrainRecentWindowShots, 4),
      2
    );
    var recent = recentList.slice(Math.max(recentList.length - recentWindow, 0));
    var recentDrainCount = 0;
    var recentDrainLossCount = 0;
    var recentDrainStreak = 0;
    var lastDrainHeavy = false;
    var usablePeerNetRatio = getPlatformUsablePeerNetRatio(profile);
    var roomProfitRaw = toNumber(state && state.roomProfitRaw, 0);
    var consecutiveMissShots = Math.max(toInt(state && state.consecutiveMissShots, 0), 0);
    var i = 0;
    for (i = 0; i < recent.length; i++) {
      var sample = pickObject(recent[i]);
      var mechanismProfile = getMechanismTypeProfile(sample.mechanismType || "");
      var sampleNetRaw =
        (Number(sample.totalWinRaw || 0) || 0) - (Number(sample.betRaw || 0) || 0);
      if (!isDrainMechanismNature(mechanismProfile.nature)) {
        continue;
      }
      recentDrainCount += 1;
      if (sampleNetRaw <= 0) {
        recentDrainLossCount += 1;
      }
    }
    for (i = recent.length - 1; i >= 0; i--) {
      var tailSample = pickObject(recent[i]);
      var tailProfile = getMechanismTypeProfile(tailSample.mechanismType || "");
      if (!isDrainMechanismNature(tailProfile.nature)) {
        break;
      }
      recentDrainStreak += 1;
      if ("drain_heavy" === String(tailProfile.nature || "")) {
        lastDrainHeavy = true;
      }
    }
    var drainMechanismRate = Number(profile.drainMechanismRate || 0) || 0;
    var positiveStructureReady = !!profile.positiveStructureReady;
    var minDirectFireWaterScore = Math.max(
      toNumber(config && config.platformDirectFireMinWaterScore, 48),
      1
    );
    var minDirectFireHighOddRate = clamp(
      toNumber(config && config.platformDirectFireMinHighOddRate, 0.18),
      0,
      1
    );
    var minDirectFirePeerNetRatio = clamp(
      toNumber(config && config.platformDirectFireMinPeerNetRatio, 0.02),
      -1,
      1
    );
    var maxDirectFireDrainMechanismRate = clamp(
      toNumber(config && config.platformDirectFireMaxDrainMechanismRate, 0.06),
      0,
      1
    );
    var maxDirectFireRoomLossRaw = Math.max(
      toNumber(config && config.platformDirectFireMaxRoomLossRaw, 0.05),
      0
    );
    var minPlatformDrainHardBlockMinPeerNetRatio = clamp(
      toNumber(config && config.platformDrainHardBlockMinPeerNetRatio, 0),
      -1,
      1
    );
    var minPlatformDrainHardBlockMinRate = clamp(
      toNumber(config && config.platformDrainHardBlockMinRate, 0.08),
      0,
      1
    );
    var recoveryHints = [];
    var hardBlocked = false;
    var blockReason = "";
    if (lastDrainHeavy) {
      hardBlocked = true;
      blockReason = "drain_heavy_recent";
    } else if (
      recentDrainStreak >= Math.max(toInt(config && config.platformDrainRecentConsecutiveBlock, 2), 1)
    ) {
      hardBlocked = true;
      blockReason = "drain_recent_streak";
    } else if (
      recentDrainCount >= Math.max(toInt(config && config.platformDrainRecentCountBlock, 2), 1) &&
      recentDrainLossCount >=
        Math.max(toInt(config && config.platformDrainRecentLossCountBlock, 2), 1)
    ) {
      hardBlocked = true;
      blockReason = "drain_recent_loss_cluster";
    } else if (
      drainMechanismRate >=
        minPlatformDrainHardBlockMinRate &&
      (
        roomProfitRaw < 0 ||
        consecutiveMissShots > 0 ||
        usablePeerNetRatio < minPlatformDrainHardBlockMinPeerNetRatio
      )
    ) {
      hardBlocked = true;
      blockReason = "drain_platform_negative";
    }
    var directFireReady = !!(
      !hardBlocked &&
      positiveStructureReady &&
      Number(profile.score || 0) >= minDirectFireWaterScore &&
      Number(profile.highOddRate || 0) >= minDirectFireHighOddRate &&
      usablePeerNetRatio >= minDirectFirePeerNetRatio &&
      drainMechanismRate <= maxDirectFireDrainMechanismRate &&
      roomProfitRaw >= -maxDirectFireRoomLossRaw
    );
    if (hardBlocked) {
      if (lastDrainHeavy) {
        recoveryHints.push("等待至少 1 次非重吃分真实结算覆盖最近重吃分");
      }
      if (
        recentDrainStreak >= Math.max(toInt(config && config.platformDrainRecentConsecutiveBlock, 2), 1)
      ) {
        recoveryHints.push(
          "最近连续吃分降到 " +
            String(Math.max(toInt(config && config.platformDrainRecentConsecutiveBlock, 2), 1) - 1) +
            " 次以下"
        );
      }
      if (
        recentDrainLossCount >=
        Math.max(toInt(config && config.platformDrainRecentLossCountBlock, 2), 1)
      ) {
        recoveryHints.push(
          "最近亏损吃分样本降到 " +
            String(Math.max(toInt(config && config.platformDrainRecentLossCountBlock, 2), 1) - 1) +
            " 次以下"
        );
      }
      if (drainMechanismRate >= minPlatformDrainHardBlockMinRate) {
        recoveryHints.push(
          "吃分机制率降到 " + formatAmountValue(minPlatformDrainHardBlockMinRate * 100) + "% 以下"
        );
      }
      if (roomProfitRaw < 0) {
        recoveryHints.push("本房盈亏回到非负");
      }
      if (usablePeerNetRatio < minPlatformDrainHardBlockMinPeerNetRatio) {
        recoveryHints.push(
          "同屏可打净回报回到 " +
            formatAmountValue(minPlatformDrainHardBlockMinPeerNetRatio * 100) +
            "% 以上"
        );
      }
      if (consecutiveMissShots > 0) {
        recoveryHints.push("连未中清零");
      }
    } else if (!directFireReady) {
      if (!positiveStructureReady) {
        recoveryHints.push("等待正向结构信号成立");
      }
      if (Number(profile.score || 0) < minDirectFireWaterScore) {
        recoveryHints.push(
          "放水分提高到 " + String(minDirectFireWaterScore) + " 以上"
        );
      }
      if (Number(profile.highOddRate || 0) < minDirectFireHighOddRate) {
        recoveryHints.push(
          "高赔率占比提高到 " + formatAmountValue(minDirectFireHighOddRate * 100) + "% 以上"
        );
      }
      if (usablePeerNetRatio < minDirectFirePeerNetRatio) {
        recoveryHints.push(
          "同屏可打净回报提高到 " +
            formatAmountValue(minDirectFirePeerNetRatio * 100) +
            "% 以上"
        );
      }
      if (drainMechanismRate > maxDirectFireDrainMechanismRate) {
        recoveryHints.push(
          "吃分机制率降到 " +
            formatAmountValue(maxDirectFireDrainMechanismRate * 100) +
            "% 以下"
        );
      }
      if (roomProfitRaw < -maxDirectFireRoomLossRaw) {
        recoveryHints.push(
          "本房亏损收敛到 -" +
            formatAmountValue(maxDirectFireRoomLossRaw) +
            " 以内"
        );
      }
    }
    if (!recoveryHints.length) {
      recoveryHints.push(directFireReady ? "当前已满足直开资格" : "继续等待更多正向样本");
    }
    return {
      hardBlocked: hardBlocked,
      blockReason: blockReason,
      directFireReady: directFireReady,
      recoveryHints: recoveryHints,
      recentDrainCount: recentDrainCount,
      recentDrainLossCount: recentDrainLossCount,
      recentDrainStreak: recentDrainStreak,
      lastDrainHeavy: lastDrainHeavy,
      drainMechanismRate: drainMechanismRate,
      usablePeerNetRatio: usablePeerNetRatio,
      positiveStructureReady: positiveStructureReady,
      minDirectFireWaterScore: minDirectFireWaterScore,
      minDirectFireHighOddRate: minDirectFireHighOddRate,
      minDirectFirePeerNetRatio: minDirectFirePeerNetRatio,
      maxDirectFireDrainMechanismRate: maxDirectFireDrainMechanismRate,
      maxDirectFireRoomLossRaw: maxDirectFireRoomLossRaw,
    };
  }

  function getPlatformWaterGuardReasonText(reason) {
    var code = String(reason || "");
    if ("drain_heavy_recent" === code) {
      return "最近命中重吃分机制";
    }
    if ("drain_recent_streak" === code) {
      return "最近连续吃分机制";
    }
    if ("drain_recent_loss_cluster" === code) {
      return "最近吃分且连续亏损";
    }
    if ("drain_platform_negative" === code) {
      return "平台吃分抬升且房内转冷";
    }
    if (!code) {
      return "-";
    }
    return code;
  }

  function getPlatformWaterGuardLabel(guard) {
    var data = pickObject(guard);
    if (data.hardBlocked) {
      return "吃分红灯";
    }
    if (data.directFireReady) {
      return "可直开";
    }
    return "仅过滤";
  }

  function getPlatformWaterGuardTone(guard) {
    var data = pickObject(guard);
    if (data.hardBlocked) {
      return "danger";
    }
    if (data.directFireReady) {
      return "good";
    }
    return "warn";
  }

  function getPlatformWaterGuardRecoveryText(guard, maxCount) {
    var data = pickObject(guard);
    var hints = Array.isArray(data.recoveryHints) ? data.recoveryHints.slice() : [];
    var limit = Math.max(toInt(maxCount, 3), 1);
    if (!hints.length) {
      return "-";
    }
    return hints.slice(0, limit).join(" | ");
  }

  function getCombatPolicyReasonText(reason) {
    var code = String(reason || "");
    if ("blocked_drain_mechanism" === code) {
      return "吃分红灯阻断";
    }
    if ("waiting_platform_water_sample" === code) {
      return "放水样本不足";
    }
    if ("waiting_platform_water_warmup" === code) {
      return "房态未升温";
    }
    if ("waiting_platform_peer_recovery" === code) {
      return "同屏可打净回报偏冷";
    }
    if ("waiting_platform_direct_fire_window" === code) {
      return "房态过滤通过，但未达到直开线";
    }
    if ("waiting_self_loss_streak" === code) {
      return "连空后继续观察";
    }
    if ("waiting_self_room_recovery" === code) {
      return "本房回报待修复";
    }
    if ("self_loss_streak_primary_forced_probe" === code) {
      return "主目标强信号单发验证";
    }
    if ("self_loss_streak_precision_probe" === code) {
      return "连空窄窗验证";
    }
    if ("warming_self_loss_streak_probe" === code) {
      return "升温窗单发验证";
    }
    if ("self_secondary_probe_only" === code) {
      return "仅允许二级目标试探";
    }
    if ("self_primary_ready" === code) {
      return "主目标允许实战";
    }
    if ("self_secondary_ready" === code) {
      return "次级目标允许实战";
    }
    if ("self_special_event_probe" === code) {
      return "特殊事件试探";
    }
    if ("self_profit_target_ready" === code) {
      return "候选达标，可进入实战链路";
    }
    if ("waiting_profit_target" === code) {
      return "等待利润候选";
    }
    if (!code) {
      return "-";
    }
    return code;
  }

  function getCombatPolicyLabel(policy) {
    var data = pickObject(policy);
    if (!String(data.reason || "") && !Object.keys(data).length) {
      return "-";
    }
    if (data.allowCombat) {
      return data.probeOnly ? "试探开火" : "允许实战";
    }
    return "观察等待";
  }

  function getCombatPolicyTone(policy) {
    var data = pickObject(policy);
    var reason = String(data.reason || "");
    if (data.allowCombat) {
      return data.probeOnly ? "warn" : "good";
    }
    if (
      "blocked_drain_mechanism" === reason ||
      "waiting_self_room_recovery" === reason
    ) {
      return "danger";
    }
    if (
      "waiting_platform_water_sample" === reason ||
      "waiting_platform_water_warmup" === reason ||
      "waiting_platform_peer_recovery" === reason ||
      "waiting_platform_direct_fire_window" === reason
    ) {
      return "warn";
    }
    return "accent";
  }

  function buildPlatformWaterProfile(state) {
    var recent = trimRecentSyncOutcomes(state);
    var selfPlayerID = Number(getSelfPlayerRuntime().playerID || 0) || 0;
    var desiredModeId = resolveAimAttackModeId();
    var selfList = [];
    var peerList = [];
    for (var i = 0; i < recent.length; i++) {
      var item = recent[i];
      if (!item || !(Number(item.playerID || 0) > 0)) {
        continue;
      }
      if (selfPlayerID > 0 && Number(item.playerID || 0) === selfPlayerID) {
        selfList.push(item);
      } else {
        peerList.push(item);
      }
    }
    var baselineHitRate = clamp(
      toNumber(state.config.platformWaterBaselineHitRate, 0.1),
      0.02,
      0.95
    );
    var baselineHighMechanismRate = clamp(
      toNumber(state.config.platformWaterBaselineHighMechanismRate, 0.035),
      0.005,
      0.9
    );
    var highOddThreshold = Math.max(toNumber(state.config.platformWaterBigWinOddThreshold, 20), 1);
    var highMechanismRate = calcPredicateRate(recent, function (item) {
      var mechanismProfile = getMechanismTypeProfile(item && item.mechanismType);
      return isPositiveWaterMechanismNature(mechanismProfile.nature);
    });
    var drainMechanismRate = calcPredicateRate(recent, function (item) {
      var mechanismProfile = getMechanismTypeProfile(item && item.mechanismType);
      return isDrainMechanismNature(mechanismProfile.nature);
    });
    var openFeatureRate = calcPredicateRate(recent, hasOpenSpecialFeature);
    var openFeatureHitRate = calcPredicateRate(recent, function (item) {
      return hasOpenSpecialFeature(item) && (
        (Number(item.killCount || 0) || 0) > 0 ||
        (Number(item.totalWinRaw || 0) || 0) > 0
      );
    });
    var poolFlagRate = calcPredicateRate(recent, function (item) {
      return !!item.poolFlag;
    });
    var highOddRate = calcPredicateRate(recent, function (item) {
      return (Number(item.oddRaw || 0) || 0) >= highOddThreshold;
    });
    var peerHitRate = calcOutcomeHitRate(peerList);
    var selfHitRate = calcOutcomeHitRate(selfList);
    var peerNetRatio = calcOutcomeNetRatio(peerList);
    var selfNetRatio = calcOutcomeNetRatio(selfList);
    var peerDesiredModeList = peerList.filter(function (item) {
      return isDesiredAttackModeOutcome(item, desiredModeId);
    });
    var peerUsableList = peerDesiredModeList.filter(function (item) {
      return isUsablePrecisionTargetOutcome(state && state.config, item);
    });
    var peerDesiredModeRate = calcPredicateRate(peerList, function (item) {
      return isDesiredAttackModeOutcome(item, desiredModeId);
    });
    var peerDesiredModeNetRatio = calcOutcomeNetRatio(peerDesiredModeList);
    var peerUsableHitRate = calcOutcomeHitRate(peerUsableList);
    var peerUsableNetRatio = calcOutcomeNetRatio(peerUsableList);
    var peerBigWinRate = calcPredicateRate(peerList, function (item) {
      var betRaw = Number(item.betRaw || 0) || 0;
      var totalWinRaw = Number(item.totalWinRaw || 0) || 0;
      var oddRaw = Number(item.oddRaw || 0) || 0;
      return totalWinRaw > 0 && (
        (betRaw > 0 && totalWinRaw >= betRaw * 3) ||
        oddRaw >= highOddThreshold
      );
    });
    var sampleCount = recent.length;
    var peerSampleCount = peerList.length;
    var selfSampleCount = selfList.length;
    var minSamples = Math.max(toInt(state.config.platformWaterMinSamples, 36), 12);
    var score = 0;
    var componentScores = {
      peerHit: 0,
      peerNet: 0,
      peerNetPenalty: 0,
      selfHit: 0,
      selfNet: 0,
      drainMechanismPenalty: 0,
      highMechanism: 0,
      openFeature: 0,
      featureHit: 0,
      peerBigWin: 0,
      highOdd: 0,
      poolFlag: 0,
      netOddCombo: 0,
      peerUsable: 0,
      peerAlignmentPenalty: 0,
    };
    if (sampleCount >= minSamples) {
      componentScores.peerHit = clamp(((peerHitRate - baselineHitRate) / 0.12) * 24, 0, 24);
      componentScores.peerNet = clamp(((peerNetRatio + 0.01) / 0.12) * 20, 0, 20);
      componentScores.selfHit = clamp(((selfHitRate - baselineHitRate) / 0.1) * 8, 0, 8);
      componentScores.highMechanism = clamp(
        ((highMechanismRate - baselineHighMechanismRate) / 0.08) * 12,
        0,
        12
      );
      componentScores.openFeature = clamp((openFeatureRate / 0.24) * 8, 0, 8);
      componentScores.featureHit = clamp((openFeatureHitRate / 0.14) * 10, 0, 10);
      componentScores.peerBigWin = clamp((peerBigWinRate / 0.16) * 12, 0, 12);
      componentScores.highOdd = clamp((highOddRate / 0.18) * 12, 0, 12);
      componentScores.poolFlag = clamp((poolFlagRate / 0.12) * 6, 0, 6);
      componentScores.netOddCombo = clamp(
        ((Math.max(peerNetRatio, 0) / 0.25) + (highOddRate / 0.45) - 1) * 6,
        0,
        8
      );
      componentScores.peerUsable = clamp(
        ((Math.max(peerUsableNetRatio, 0) / 0.12) + (Math.max(peerUsableHitRate - baselineHitRate, 0) / 0.08)) * 8,
        0,
        12
      );
      if (peerNetRatio < -0.08) {
        componentScores.peerNetPenalty = clamp(
          ((Math.abs(peerNetRatio) - 0.08) / 0.22) * 22,
          0,
          22
        );
      }
      if (drainMechanismRate >= 0.06) {
        componentScores.drainMechanismPenalty = clamp(
          ((drainMechanismRate - 0.06) / 0.12) * 10,
          0,
          10
        );
      }
      if (
        peerNetRatio <= -0.12 &&
        drainMechanismRate >= 0.08
      ) {
        componentScores.drainMechanismPenalty += clamp(
          ((drainMechanismRate - 0.08) / 0.12) * 12,
          0,
          12
        );
      }
      if (selfNetRatio > 0) {
        componentScores.selfNet = clamp((selfNetRatio / 0.25) * 8, 0, 8);
      }
      if (peerNetRatio >= 0.08) {
        componentScores.peerAlignmentPenalty += clamp(
          (Math.max(peerNetRatio - Math.max(peerUsableNetRatio, 0), 0) / 0.18) * 22,
          0,
          22
        );
        if (peerDesiredModeRate < 0.35) {
          componentScores.peerAlignmentPenalty += clamp(
            ((0.35 - peerDesiredModeRate) / 0.35) * 12,
            0,
            12
          );
        }
      }
      score += componentScores.peerHit;
      score += componentScores.peerNet;
      score += componentScores.selfHit;
      score += componentScores.selfNet;
      score += componentScores.highMechanism;
      score += componentScores.openFeature;
      score += componentScores.featureHit;
      score += componentScores.peerBigWin;
      score += componentScores.highOdd;
      score += componentScores.poolFlag;
      score += componentScores.netOddCombo;
      score += componentScores.peerUsable;
      score -= componentScores.peerNetPenalty;
      score -= componentScores.drainMechanismPenalty;
      score -= componentScores.peerAlignmentPenalty;
    }
    score = Math.round(clamp(score, 0, 100));
    var level = "normal";
    var label = "常态房";
    var drainRoomDetected =
      peerNetRatio <= -0.18 &&
      drainMechanismRate >= 0.08;
    var positiveStructureReady = !!(
      highMechanismRate >= Math.max(baselineHighMechanismRate + 0.015, 0.05) ||
      openFeatureHitRate >= 0.03 ||
      highOddRate >= 0.14 ||
      peerUsableNetRatio >= 0.02 ||
      peerNetRatio >= 0.05
    );
    if (sampleCount < minSamples) {
      level = "insufficient";
      label = "样本不足";
    } else if (drainRoomDetected && peerNetRatio <= -0.45) {
      level = "normal";
      label = "重吃分";
    } else if (drainRoomDetected) {
      level = "normal";
      label = "机制吃分";
    } else if (
      positiveStructureReady &&
      score >= Math.max(toInt(state.config.platformWaterOpenScoreThreshold, 56), 30)
    ) {
      level = "open_suspected";
      label = "疑似放水";
    } else if (
      positiveStructureReady &&
      score >= Math.max(toInt(state.config.platformWaterWarmScoreThreshold, 34), 20)
    ) {
      level = "warming";
      label = "放水升温";
    }
    return {
      level: level,
      label: label,
      score: score,
      sampleCount: sampleCount,
      peerSampleCount: peerSampleCount,
      selfSampleCount: selfSampleCount,
      peerHitRate: peerHitRate,
      selfHitRate: selfHitRate,
      peerNetRatio: peerNetRatio,
      selfNetRatio: selfNetRatio,
      peerDesiredModeRate: peerDesiredModeRate,
      peerDesiredModeSampleCount: peerDesiredModeList.length,
      peerDesiredModeNetRatio: peerDesiredModeNetRatio,
      peerUsableSampleCount: peerUsableList.length,
      peerUsableHitRate: peerUsableHitRate,
      peerUsableNetRatio: peerUsableNetRatio,
      highMechanismRate: highMechanismRate,
      drainMechanismRate: drainMechanismRate,
      peerBigWinRate: peerBigWinRate,
      openFeatureRate: openFeatureRate,
      openFeatureHitRate: openFeatureHitRate,
      highOddRate: highOddRate,
      poolFlagRate: poolFlagRate,
      baselineHitRate: baselineHitRate,
      baselineHighMechanismRate: baselineHighMechanismRate,
      positiveStructureReady: positiveStructureReady,
      componentScores: componentScores,
      updatedAt: Date.now(),
    };
  }

  function trimPlatformWaterTrendHistory(state) {
    if (!state || !Array.isArray(state.platformWaterTrendHistory)) {
      return [];
    }
    var maxCount = 48;
    if (state.platformWaterTrendHistory.length > maxCount) {
      state.platformWaterTrendHistory = state.platformWaterTrendHistory.slice(
        state.platformWaterTrendHistory.length - maxCount
      );
    }
    return state.platformWaterTrendHistory.slice();
  }

  function clonePlatformWaterTrendHistory(state, maxCount) {
    var list = trimPlatformWaterTrendHistory(state);
    if (!(Number(maxCount || 0) > 0) || list.length <= maxCount) {
      return list;
    }
    return list.slice(list.length - maxCount);
  }

  function recordPlatformWaterTrendSample(state, profile) {
    if (!state || !profile) {
      return [];
    }
    if (!Array.isArray(state.platformWaterTrendHistory)) {
      state.platformWaterTrendHistory = [];
    }
    var item = {
      ts: Date.now(),
      roomKey: String(state.lastRoomKey || ""),
      level: String(profile.level || ""),
      label: String(profile.label || ""),
      score: Number(profile.score || 0) || 0,
      sampleCount: Number(profile.sampleCount || 0) || 0,
      peerHitRate: Number(profile.peerHitRate || 0) || 0,
      peerNetRatio: Number(profile.peerNetRatio || 0) || 0,
      selfNetRatio: Number(profile.selfNetRatio || 0) || 0,
      peerDesiredModeRate: Number(profile.peerDesiredModeRate || 0) || 0,
      peerUsableNetRatio: Number(profile.peerUsableNetRatio || 0) || 0,
      highMechanismRate: Number(profile.highMechanismRate || 0) || 0,
      openFeatureRate: Number(profile.openFeatureRate || 0) || 0,
      highOddRate: Number(profile.highOddRate || 0) || 0,
    };
    var last =
      state.platformWaterTrendHistory.length > 0
        ? state.platformWaterTrendHistory[state.platformWaterTrendHistory.length - 1]
        : null;
    if (
      last &&
      String(last.roomKey || "") === item.roomKey &&
      Date.now() - (Number(last.ts || 0) || 0) <= 900 &&
      Number(last.score || 0) === item.score &&
      Number(last.sampleCount || 0) === item.sampleCount &&
      String(last.level || "") === item.level &&
      Math.abs((Number(last.peerUsableNetRatio || 0) || 0) - item.peerUsableNetRatio) < 0.0001 &&
      Math.abs((Number(last.peerDesiredModeRate || 0) || 0) - item.peerDesiredModeRate) < 0.0001 &&
      Math.abs((Number(last.highMechanismRate || 0) || 0) - item.highMechanismRate) < 0.0001
    ) {
      state.platformWaterTrendHistory[state.platformWaterTrendHistory.length - 1] = item;
    } else {
      state.platformWaterTrendHistory.push(item);
    }
    return trimPlatformWaterTrendHistory(state);
  }

  function registerPendingFireOutcome(state, candidate, firedAt, meta) {
    if (!state || !candidate) {
      return null;
    }
    var extra = pickObject(meta);
    state.fireSequence = (Number(state.fireSequence || 0) || 0) + 1;
    var selfRuntime = getSelfPlayerRuntime();
    var pending = {
      shotId: state.fireSequence,
      firedAt: Number(firedAt || Date.now()) || Date.now(),
      playerID: Number(selfRuntime.playerID || 0) || 0,
      targetSN: Number(candidate.sn || 0) || 0,
      targetId: Number(candidate.tableEntityID || candidate.symbolID || 0) || 0,
      symbolID: Number(candidate.symbolID || 0) || 0,
      fishKind: Number(candidate.fishKind || 0) || 0,
      subFishKind: Number(candidate.subFishKind || 0) || 0,
      name: String(candidate.name || ""),
      specialEventCandidate: !!candidate.specialEventCandidate,
      fireMode: String(extra.fireMode || ""),
      fireMethod: String(extra.fireMethod || ""),
      betRaw: Number(extra.betRaw || 0) || 0,
      hitProbability: Number(extra.hitProbability || 0) || 0,
      candidateScore: Number(extra.candidateScore || 0) || 0,
      tier: String(extra.tier || ""),
      stableSeenTicks: Number(extra.stableSeenTicks || 0) || 0,
      oddsMax: Number(extra.oddsMax || 0) || 0,
      allowEmptyOddsProbe: !!extra.allowEmptyOddsProbe,
      mechanismHintType: String(extra.mechanismHintType || ""),
      mechanismHintLabel: String(extra.mechanismHintLabel || ""),
      roomProfitRaw: Number(extra.roomProfitRaw || 0) || 0,
      resolved: false,
    };
    if (!Array.isArray(state.pendingFireOutcomes)) {
      state.pendingFireOutcomes = [];
    }
    state.pendingFireOutcomes.push(pending);
    trimPendingFireOutcomes(state);
    syncPanelStatus();
    logPendingFireToConsole(pending);
    return pending;
  }

  function buildCombatPolicy(state, config, analysis) {
    var roomResolvedShotCount = Math.max(toInt(state && state.roomResolvedShotCount, 0), 0);
    var roomResolvedHitCount = Math.max(toInt(state && state.roomResolvedHitCount, 0), 0);
    var roomEntryBalanceRaw = Math.max(toNumber(state && state.roomEntryBalance, 0), 0);
    var roomProfitRaw = toNumber(state && state.roomProfitRaw, 0);
    var roomNetRatio =
      roomEntryBalanceRaw > 0 ? roomProfitRaw / roomEntryBalanceRaw : 0;
    var profitCandidate = analysis && analysis.profitCandidate ? analysis.profitCandidate : null;
    var profitScoreInfo = profitCandidate && profitCandidate.scoreInfo ? profitCandidate.scoreInfo : null;
    var profitTier = String(profitScoreInfo && profitScoreInfo.tier || "");
    var profitTargetId = Number(
      profitCandidate && (profitCandidate.tableEntityID || profitCandidate.symbolID || 0)
    ) || 0;
    var profitStableTicks = Number(
      profitScoreInfo &&
        profitScoreInfo.captureStats &&
        profitScoreInfo.captureStats.consecutiveSeenTicks || 0
    ) || 0;
    var profitScoreValue = Number(
      analysis && (analysis.profitScore || 0)
    ) || 0;
    if (!(profitScoreValue > 0)) {
      profitScoreValue = Number(
        profitScoreInfo &&
          (profitScoreInfo.score ||
            (profitScoreInfo.captureStats && profitScoreInfo.captureStats.score) ||
            0)
      ) || 0;
    }
    var profitHitProbabilityValue = Number(
      analysis && (analysis.profitHitProbability || 0)
    ) || 0;
    if (!(profitHitProbabilityValue > 0)) {
      profitHitProbabilityValue = Number(
        profitScoreInfo &&
          (profitScoreInfo.hitProbability ||
            (profitScoreInfo.captureStats && profitScoreInfo.captureStats.hitProbability) ||
            0)
      ) || 0;
    }
    var consecutiveMissShots = Math.max(toInt(state && state.consecutiveMissShots, 0), 0);
    var waterActionGuard = buildPlatformWaterActionGuard(state, config);
    var platformWaterProfile = pickObject(state && state.platformWaterProfile);
    var platformWaterLevel = String(platformWaterProfile.level || "normal");
    var policy = {
      allowCombat: false,
      allowMediumRamp: false,
      allowHighRamp: false,
      level: platformWaterLevel || "normal",
      reason: "waiting_profit_target",
      probeOnly: false,
      specialEventWindowActive: !!(profitScoreInfo && profitScoreInfo.specialEventCandidate),
    };
    if (!profitCandidate || !analysis || !analysis.profitCandidateReady) {
      return policy;
    }
    if (waterActionGuard.hardBlocked) {
      policy.reason = "blocked_drain_mechanism";
      return policy;
    }
    if (!waterActionGuard.directFireReady) {
      if ("insufficient" === platformWaterLevel) {
        policy.reason = "waiting_platform_water_sample";
      } else if (!waterActionGuard.positiveStructureReady) {
        policy.reason = "waiting_platform_water_warmup";
      } else if (
        waterActionGuard.usablePeerNetRatio <
        waterActionGuard.minDirectFirePeerNetRatio
      ) {
        policy.reason = "waiting_platform_peer_recovery";
      } else {
        policy.reason = "waiting_platform_direct_fire_window";
      }
      return policy;
    }
    if (consecutiveMissShots >= 2) {
      if (
        true === !!(config && config.enableSelfLossStreakProbeBypass) &&
        "primary" === profitTier &&
        includesNumber([2, 3, 19], profitTargetId) &&
        consecutiveMissShots <= 2 &&
        profitScoreValue >= 138 &&
        profitHitProbabilityValue >= 98 &&
        profitStableTicks >= 4 &&
        roomProfitRaw >= -0.4
      ) {
        policy.allowCombat = true;
        policy.probeOnly = true;
        policy.reason = "self_loss_streak_primary_forced_probe";
        return policy;
      }
      if (canAllowSelfLossStreakProbeBypass(analysis, state, config)) {
        policy.allowCombat = true;
        policy.probeOnly = true;
        policy.reason =
          Number(
            analysis &&
              analysis.profitCandidate &&
              (analysis.profitCandidate.tableEntityID || analysis.profitCandidate.symbolID || 0)
          ) === 2 ||
          Number(
            analysis &&
              analysis.profitCandidate &&
              (analysis.profitCandidate.tableEntityID || analysis.profitCandidate.symbolID || 0)
          ) === 3
          || Number(
            analysis &&
              analysis.profitCandidate &&
              (analysis.profitCandidate.tableEntityID || analysis.profitCandidate.symbolID || 0)
          ) === 19
            ? "self_loss_streak_precision_probe"
            : "warming_self_loss_streak_probe";
        return policy;
      }
      policy.reason = "waiting_self_loss_streak";
      return policy;
    }
    if (roomResolvedShotCount >= 3 && roomResolvedHitCount < 1) {
      policy.reason = "waiting_self_room_recovery";
      return policy;
    }
    if (roomResolvedShotCount >= 2 && roomNetRatio <= -0.18) {
      policy.reason = "waiting_self_room_recovery";
      return policy;
    }
    policy.allowCombat = true;
    policy.reason = "self_profit_target_ready";
    if ("secondary" === profitTier) {
      policy.probeOnly = !(roomResolvedHitCount > 0 && roomProfitRaw >= 0);
      policy.allowMediumRamp = false;
      policy.allowHighRamp = false;
      policy.reason = policy.probeOnly ? "self_secondary_probe_only" : "self_secondary_ready";
      return policy;
    }
    if ("primary" === profitTier) {
      policy.probeOnly = false;
      policy.allowMediumRamp = roomResolvedHitCount > 0 && roomProfitRaw > 0;
      policy.allowHighRamp = false;
      policy.reason = "self_primary_ready";
      return policy;
    }
    if (profitScoreInfo && profitScoreInfo.specialEventCandidate) {
      policy.probeOnly = true;
      policy.allowMediumRamp = false;
      policy.allowHighRamp = false;
      policy.reason = "self_special_event_probe";
      return policy;
    }
    policy.allowCombat = false;
    policy.reason = "waiting_profit_target";
    return policy;
  }

  function normalizeSyncOutcomePayload(payload) {
    if (!payload || "object" != typeof payload) {
      return null;
    }
    var spinRequest = pickObject(payload.spinRequest);
    var spinResult = pickObject(payload.spinResult);
    var mechanismResult = pickObject(spinResult.mechanismResult);
    var hitResult = pickObject(mechanismResult.hitResult);
    var bulletInfo = pickObject(spinRequest.bulletInfo);
    var poolData = pickObject(mechanismResult.poolData);
    var specialFeatureResults = Array.isArray(mechanismResult.specialFeatureResults)
      ? mechanismResult.specialFeatureResults
      : [];
    var targetInfo = parseJsonObjectSafe(spinRequest.targetInfo) || pickObject(spinRequest.targetInfo);
    var extraData = parseJsonObjectSafe(payload.extraData) || pickObject(payload.extraData);
    var targetSN =
      Number(targetInfo.targetSN || mechanismResult.targetSN || payload.targetSN || 0) || 0;
    var targetId =
      Number(targetInfo.targetId || mechanismResult.targetId || payload.targetId || 0) || 0;
    return {
      playerID: Number(payload.playerId || payload.playerID || payload.iPlayerID || 0) || 0,
      bulletId: Number(payload.bulletId || spinRequest.bulletId || 0) || 0,
      targetSN: targetSN,
      targetId: targetId,
      totalWinRaw: Number(mechanismResult.totalWin || spinResult.totalWin || payload.totalWin || 0) || 0,
      killCount: Number(hitResult.killCount || payload.killCount || 0) || 0,
      betRaw:
        Number(spinRequest.credit || bulletInfo.credit || payload.credit || payload.bet || 0) || 0,
      mechanismType: String(mechanismResult.mechanismType || payload.mechanismType || ""),
      oddRaw: Number(mechanismResult.odd || mechanismResult.odds || payload.odd || payload.odds || 0) || 0,
      fireModeId:
        Number(
          extraData["3"] ||
            extraData.mode ||
            payload.fireModeId ||
            0
        ) || 0,
      traceId:
        Number(
          extraData["7"] ||
            extraData.traceId ||
            payload.traceId ||
            0
        ) || 0,
      poolFlag: !!poolData.flag,
      specialFeatureTypes: specialFeatureResults.map(function (item) {
        return String(item && item.specialFeatureType || "");
      }).filter(function (item) {
        return !!item;
      }),
      raw: payload,
    };
  }

  function extractSyncEntityPayloadList(payload) {
    if (!payload) {
      return [];
    }
    if (Array.isArray(payload)) {
      return payload.filter(function (item) {
        return item && "object" == typeof item;
      });
    }
    if ("object" != typeof payload) {
      return [];
    }
    if (payload.spinResult || payload.spinRequest) {
      return [payload];
    }
    var params = pickObject(payload.params);
    var paramsP = parseJsonObjectSafe(params.p) || pickObject(params.p);
    var entityRaw = void 0 !== paramsP.entity ? paramsP.entity : payload.entity;
    var entityParsed = parseJsonObjectSafe(entityRaw);
    if (Array.isArray(entityParsed)) {
      return entityParsed.filter(function (item) {
        return item && "object" == typeof item;
      });
    }
    if (entityParsed && "object" == typeof entityParsed) {
      return [entityParsed];
    }
    if (Array.isArray(entityRaw)) {
      return entityRaw.filter(function (item) {
        return item && "object" == typeof item;
      });
    }
    if (entityRaw && "object" == typeof entityRaw) {
      return [entityRaw];
    }
    return [];
  }

  function extractSyncOutcomeList(notificationName, payload) {
    var result = [];
    var isProtocolSync =
      "undefined" != typeof ProtocolEvent &&
      notificationName === ProtocolEvent.ON_SET_SC_SYNC_DONE;
    var eventName = String(
      payload && (
        payload.event ||
        payload.m ||
        (payload.params && payload.params.m) ||
        (payload.params && payload.params.event) ||
        ""
      ) || ""
    );
    var actionName = String(payload && payload.action_name || "");
    var controllerName = String(payload && payload.controller_name || "");
    var isGenericSync =
      "EV_SG_SYNC" === eventName ||
      ("GenericMessage" === actionName && "SYSTEM" === controllerName);
    if (!isProtocolSync && !isGenericSync) {
      return result;
    }
    var payloadList = extractSyncEntityPayloadList(payload);
    if (!payloadList.length && isProtocolSync) {
      payloadList = [payload];
    }
    for (var i = 0; i < payloadList.length; i++) {
      var syncOutcome = normalizeSyncOutcomePayload(payloadList[i]);
      if (syncOutcome && syncOutcome.playerID > 0) {
        result.push(syncOutcome);
      }
    }
    return result;
  }

  var resolveController = {
    extractSyncOutcomeList: function (notificationName, payload) {
      return extractSyncOutcomeList(notificationName, payload);
    },
    matchPendingForSync: function (syncOutcome, state) {
      var list = trimPendingFireOutcomes(state);
      for (var i = list.length - 1; i >= 0; i--) {
        var pending = list[i];
        if (!pending || pending.resolved) {
          continue;
        }
        if (
          syncOutcome.playerID > 0 &&
          pending.playerID > 0 &&
          syncOutcome.playerID !== pending.playerID
        ) {
          continue;
        }
        if (
          syncOutcome.targetSN > 0 &&
          pending.targetSN > 0 &&
          syncOutcome.targetSN === pending.targetSN
        ) {
          return pending;
        }
        if (
          !(syncOutcome.targetSN > 0) &&
          syncOutcome.targetId > 0 &&
          pending.targetId > 0 &&
          syncOutcome.targetId === pending.targetId &&
          Date.now() - (Number(pending.firedAt || 0) || 0) <= 6000
        ) {
          return pending;
        }
      }
      return null;
    },
    applyResolvedOutcome: function (state, pending, syncOutcome) {
      if (!state || !pending || !syncOutcome) {
        return null;
      }
      var now = Date.now();
      var expectedTargetSN = Number(pending.targetSN || 0) || 0;
      var expectedTargetId = Number(pending.targetId || 0) || 0;
      var resolvedTargetSN = Number(syncOutcome.targetSN || expectedTargetSN || 0) || 0;
      var resolvedTargetId = Number(syncOutcome.targetId || expectedTargetId || 0) || 0;
      var targetBindingMismatch = false;
      if (
        resolvedTargetSN > 0 &&
        expectedTargetSN > 0 &&
        resolvedTargetSN !== expectedTargetSN
      ) {
        targetBindingMismatch = true;
      } else if (
        resolvedTargetId > 0 &&
        expectedTargetId > 0 &&
        resolvedTargetId !== expectedTargetId
      ) {
        targetBindingMismatch = true;
      }
      pending.resolved = true;
      pending.resolvedAt = now;
      pending.expectedTargetSN = expectedTargetSN;
      pending.expectedTargetId = expectedTargetId;
      pending.resolvedTargetSN = resolvedTargetSN;
      pending.resolvedTargetId = resolvedTargetId;
      pending.targetBindingMismatch = !!targetBindingMismatch;
      pending.totalWinRaw = Number(syncOutcome.totalWinRaw || 0) || 0;
      pending.killCount = Number(syncOutcome.killCount || 0) || 0;
      pending.betRaw = Number(syncOutcome.betRaw || 0) || 0;
      pending.oddRaw = Number(syncOutcome.oddRaw || 0) || 0;
      pending.mechanismType = String(syncOutcome.mechanismType || "");
      var strictHitTargetBinding = true === !!(state.config && state.config.strictHitTargetBinding);
      pending.outcome =
        (!strictHitTargetBinding || !targetBindingMismatch) &&
        (pending.killCount > 0 || pending.totalWinRaw > 0)
          ? "hit"
          : "miss";
      state.lastResolvedFireOutcome = {
        shotId: Number(pending.shotId || 0) || 0,
        firedAt: Number(pending.firedAt || 0) || 0,
        resolvedAt: now,
        outcome: pending.outcome,
        targetSN: resolvedTargetSN,
        targetId: resolvedTargetId,
        expectedTargetSN: expectedTargetSN,
        expectedTargetId: expectedTargetId,
        resolvedTargetSN: resolvedTargetSN,
        resolvedTargetId: resolvedTargetId,
        targetBindingMismatch: !!targetBindingMismatch,
        name: String(pending.name || ""),
        totalWinRaw: pending.totalWinRaw,
        killCount: pending.killCount,
        betRaw: pending.betRaw,
        oddRaw: pending.oddRaw,
        mechanismType: pending.mechanismType,
      };
      state.roomResolvedShotCount = (Number(state.roomResolvedShotCount || 0) || 0) + 1;
      if ("hit" === pending.outcome) {
        state.roomResolvedHitCount = (Number(state.roomResolvedHitCount || 0) || 0) + 1;
        state.consecutiveMissShots = 0;
        state.recentMissBlockedTargetId = 0;
        state.recentMissBlockedTargetUntil = 0;
        if ("cold_probe" === String(pending.fireMode || "")) {
          state.coldRoomFollowupShotsRemaining = Math.max(
            toInt(state.config.coldRoomFollowupMaxShots, 2),
            0
          );
          state.coldRoomFollowupUntil =
            now + Math.max(toInt(state.config.coldRoomFollowupWindowSeconds, 12), 1) * 1000;
        }
      } else {
        state.consecutiveMissShots = (Number(state.consecutiveMissShots || 0) || 0) + 1;
        if (includesNumber([2, 3, 17, 19, 101], resolvedTargetId)) {
          state.recentMissBlockedTargetId = resolvedTargetId;
          state.recentMissBlockedTargetUntil =
            now + Math.max(toInt(state.config && state.config.recentMissTargetBlockMs, 9000), 2000);
        }
        if ("cold_probe" === String(pending.fireMode || "")) {
          state.coldRoomFollowupShotsRemaining = 0;
          state.coldRoomFollowupUntil = 0;
        }
        if (
          state.consecutiveMissShots >=
          Math.max(toInt(state.config.maxConsecutiveMissShots, 2), 1)
        ) {
          state.riskCooldownUntil =
            now + Math.max(toInt(state.config.riskCooldownMs, 15000), 1000);
        }
      }
      if (state.lastDecision && "object" == typeof state.lastDecision) {
        state.lastDecision.lastResolvedFireOutcome = cloneObject(state.lastResolvedFireOutcome);
        state.lastDecision.consecutiveMissShots = state.consecutiveMissShots;
        state.lastDecision.riskCooldownUntil = state.riskCooldownUntil;
        state.lastDecision.pendingFireOutcome = getLatestPendingFireOutcome(state);
      }
      trimPendingFireOutcomes(state);
      updateAdaptiveBlacklistsFromOutcome(state, state.lastResolvedFireOutcome, state.config);
      updateRoomTemporaryTargetBlocksFromOutcome(
        state,
        state.lastResolvedFireOutcome,
        state.config
      );
      state.lastResolvedFireOutcome.resolvedTargetStat = getOutcomeStatSummaryFromBucket(
        state.targetOutcomeStats,
        resolvedTargetId
      );
      if (targetBindingMismatch) {
        recordFireAudit(state, "target_binding_mismatch", {
          shotId: Number(pending.shotId || 0) || 0,
          expectedTargetId: expectedTargetId,
          expectedTargetSN: expectedTargetSN,
          resolvedTargetId: resolvedTargetId,
          resolvedTargetSN: resolvedTargetSN,
          fireMethod: String(pending.fireMethod || ""),
        });
      } else {
        syncLatestFireAuditToDecision(state);
      }
      if (state.lastDecision && "object" == typeof state.lastDecision) {
        state.lastDecision.adaptiveBlacklistTargetCount = Array.isArray(state.adaptiveBlacklistTargetIds)
          ? state.adaptiveBlacklistTargetIds.length
          : 0;
        state.lastDecision.adaptiveBlacklistOddCount = Array.isArray(state.adaptiveBlacklistOdds)
          ? state.adaptiveBlacklistOdds.length
          : 0;
        state.lastDecision.latestAdaptiveBlacklistTarget = cloneObject(state.latestAdaptiveBlacklistTarget);
        state.lastDecision.latestAdaptiveBlacklistOdd = cloneObject(state.latestAdaptiveBlacklistOdd);
        state.lastDecision.lastAdaptiveBlacklistAt = Number(state.lastAdaptiveBlacklistAt || 0) || 0;
      }
      syncPanelStatus();
      logResolvedOutcomeToConsole(state.lastResolvedFireOutcome);
      return state.lastResolvedFireOutcome;
    },
    handleSyncOutcomeNotification: function (notificationName, payload) {
      if (!runtimeState || !runtimeState.active) {
        return;
      }
      var syncOutcomeList = this.extractSyncOutcomeList(notificationName, payload);
      if (!syncOutcomeList.length) {
        return;
      }
      var selfRuntime = getSelfPlayerRuntime();
      var desiredModeId = resolveAimAttackModeId();
      for (var i = 0; i < syncOutcomeList.length; i++) {
        var syncOutcome = syncOutcomeList[i];
        recordRecentSyncOutcome(runtimeState, syncOutcome);
        if (
          Number(selfRuntime.playerID || 0) > 0 &&
          syncOutcome.playerID !== Number(selfRuntime.playerID || 0)
        ) {
          continue;
        }
        runtimeState.lastObservedSelfFireAt = Date.now();
        runtimeState.lastObservedSelfFireModeId = Number(syncOutcome.fireModeId || 0) || 0;
        runtimeState.lastObservedSelfFireModeLabel = getAttackModeLabel(
          Number(syncOutcome.fireModeId || 0) || 0
        );
        runtimeState.lastObservedSelfFireTargetId = Number(syncOutcome.targetId || 0) || 0;
        runtimeState.lastObservedSelfFireTargetSN = Number(syncOutcome.targetSN || 0) || 0;
        runtimeState.lastObservedSelfFireTraceId = Number(syncOutcome.traceId || 0) || 0;
        recordRecentSelfResolvedOutcome(runtimeState, syncOutcome);
        runtimeState.observedSelfResolvedCount =
          (Number(runtimeState.observedSelfResolvedCount || 0) || 0) + 1;
        runtimeState.roomObservedSelfResolvedCount =
          (Number(runtimeState.roomObservedSelfResolvedCount || 0) || 0) + 1;
        var pending = this.matchPendingForSync(syncOutcome, runtimeState);
        if (!pending) {
          var unexpectedAuditType = getNativeAttackModeAuditType(
            syncOutcome.fireModeId,
            desiredModeId
          );
          if ((Number(syncOutcome.fireModeId || 0) || 0) === desiredModeId) {
            recordUntrackedSelfResolvedOutcome(runtimeState, syncOutcome);
            recordFireAudit(runtimeState, "desired_mode_sync_without_pending", {
              source: "sync_without_pending",
              fireModeId: Number(syncOutcome.fireModeId || 0) || 0,
              fireModeLabel: getAttackModeLabel(syncOutcome.fireModeId),
              desiredModeId: desiredModeId,
              desiredModeLabel: getAttackModeLabel(desiredModeId),
              resolvedTargetId: Number(syncOutcome.targetId || 0) || 0,
              resolvedTargetSN: Number(syncOutcome.targetSN || 0) || 0,
              mechanismType: String(syncOutcome.mechanismType || ""),
              totalWinRaw: Number(syncOutcome.totalWinRaw || 0) || 0,
              betRaw: Number(syncOutcome.betRaw || 0) || 0,
              traceId: Number(syncOutcome.traceId || 0) || 0,
              roomObservedSelfResolvedCount:
                Number(runtimeState.roomObservedSelfResolvedCount || 0) || 0,
              roomResolvedShotCount: Number(runtimeState.roomResolvedShotCount || 0) || 0,
              roomUntrackedSelfResolvedCount:
                Number(runtimeState.roomUntrackedSelfResolvedCount || 0) || 0,
            });
          }
          if (unexpectedAuditType) {
            recordFireAudit(runtimeState, unexpectedAuditType, {
              source: "sync_without_pending",
              fireModeId: Number(syncOutcome.fireModeId || 0) || 0,
              fireModeLabel: getAttackModeLabel(syncOutcome.fireModeId),
              desiredModeId: desiredModeId,
              desiredModeLabel: getAttackModeLabel(desiredModeId),
              resolvedTargetId: Number(syncOutcome.targetId || 0) || 0,
              resolvedTargetSN: Number(syncOutcome.targetSN || 0) || 0,
              mechanismType: String(syncOutcome.mechanismType || ""),
              totalWinRaw: Number(syncOutcome.totalWinRaw || 0) || 0,
              betRaw: Number(syncOutcome.betRaw || 0) || 0,
              traceId: Number(syncOutcome.traceId || 0) || 0,
            });
          }
          if (
            Number(runtimeState.lastFireAt || 0) > 0 &&
            Date.now() - (Number(runtimeState.lastFireAt || 0) || 0) <=
              Math.max(toInt(runtimeState.config.pendingFireOutcomeTimeoutMs, 2800), 800) * 2
          ) {
            recordFireAudit(runtimeState, "native_fire_leak", {
              source: "sync_without_pending",
              resolvedTargetId: Number(syncOutcome.targetId || 0) || 0,
              resolvedTargetSN: Number(syncOutcome.targetSN || 0) || 0,
              mechanismType: String(syncOutcome.mechanismType || ""),
              totalWinRaw: Number(syncOutcome.totalWinRaw || 0) || 0,
              betRaw: Number(syncOutcome.betRaw || 0) || 0,
            });
          }
          continue;
        }
        this.applyResolvedOutcome(runtimeState, pending, syncOutcome);
      }
      runtimeState.platformWaterProfile = buildPlatformWaterProfile(runtimeState);
      recordPlatformWaterTrendSample(runtimeState, runtimeState.platformWaterProfile);
      logPlatformWaterProfileToConsole(runtimeState.platformWaterProfile);
    },
  };

  function findPendingFireOutcomeForSync(syncOutcome, state) {
    return resolveController.matchPendingForSync(syncOutcome, state);
  }

  function applyResolvedFireOutcome(state, pending, syncOutcome) {
    return resolveController.applyResolvedOutcome(state, pending, syncOutcome);
  }

  function handleSyncOutcomeNotification(notificationName, payload) {
    return resolveController.handleSyncOutcomeNotification(notificationName, payload);
  }

  function ensureSyncOutcomeBridge() {
    var facade = getFacade();
    if (!facade || "function" != typeof facade.sendNotification) {
      return false;
    }
    if (facade.__OFFLINE_GUARD_SYNC_BRIDGE_INSTALLED__) {
      return true;
    }
    var originalSendNotification = facade.sendNotification;
    if ("function" != typeof originalSendNotification) {
      return false;
    }
    facade.sendNotification = function (notificationName, body, type) {
      var result = originalSendNotification.apply(this, arguments);
      try {
        handleSyncOutcomeNotification(notificationName, body);
      } catch (err) {}
      return result;
    };
    facade.__OFFLINE_GUARD_SYNC_BRIDGE_INSTALLED__ = true;
    return true;
  }

  function getSelfFortBulletType() {
    try {
      var fortProxy = getFortProxyInstance();
      if (!fortProxy || "function" != typeof fortProxy.getSelfFortViewObject) {
        return null;
      }
      var fortView = fortProxy.getSelfFortViewObject();
      var fortTableData =
        fortView && "function" == typeof fortView.getFortTableData
          ? fortView.getFortTableData()
          : null;
      if (!fortTableData || "object" != typeof fortTableData) {
        return null;
      }
      if (hasOwn(fortTableData, "bulletType")) {
        return Number(fortTableData.bulletType || 0) || 0;
      }
      if (hasOwn(fortTableData, "id")) {
        return Number(fortTableData.id || 0) || 0;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  function isDisplayNodeVisible(node) {
    if (!node) {
      return false;
    }
    if (false === node.visible || false === node.active || false === node.activeInHierarchy) {
      return false;
    }
    if (void 0 !== node.opacity && Number(node.opacity) <= 0) {
      return false;
    }
    return true;
  }

  function buildRoomSummary(room) {
    if (!room) {
      return null;
    }
    return {
      id:
        void 0 !== room.id
          ? room.id
          : void 0 !== room._id
            ? room._id
            : 0,
      name: room.name || room._name || "",
      groupId: room.groupId || room._groupId || "",
      isGame: void 0 !== room.isGame ? !!room.isGame : !!room._isGame,
      isJoined: void 0 !== room.isJoined ? !!room.isJoined : !!room._isJoined,
      userCount:
        void 0 !== room.userCount
          ? room.userCount
          : void 0 !== room._userCount
            ? room._userCount
            : 0,
      maxUsers:
        void 0 !== room.maxUsers
          ? room.maxUsers
          : void 0 !== room._maxUsers
            ? room._maxUsers
            : 0,
    };
  }

  function getJoinedRoomSummaries(sfs) {
    if (!sfs || "function" != typeof sfs.getJoinedRooms) {
      return [];
    }
    var rooms = sfs.getJoinedRooms() || [];
    var result = [];
    for (var i = 0; i < rooms.length; i++) {
      var summary = buildRoomSummary(rooms[i]);
      if (summary) {
        result.push(summary);
      }
    }
    return result;
  }

  function getCurrentJoinedRoomSummary(joinedRooms) {
    var rooms = Array.isArray(joinedRooms) ? joinedRooms : [];
    for (var i = 0; i < rooms.length; i++) {
      if (rooms[i] && rooms[i].isGame) {
        return rooms[i];
      }
    }
    return rooms.length ? rooms[0] : null;
  }

  function normalizeRoomSelector(target) {
    if ("number" == typeof target) {
      return { roomId: Number(target) || 0 };
    }
    if ("string" == typeof target) {
      var text = String(target || "").trim();
      if (/^\d+$/.test(text)) {
        return { roomId: Number(text) || 0 };
      }
      return { roomSize: text };
    }
    return target && "object" == typeof target ? target : {};
  }

  function resolveLobbyRoomEnum(value) {
    var text = String(value || "")
      .trim()
      .toLowerCase();
    if (!text) {
      return -1;
    }
    if (
      [
        "0",
        "small",
        "low",
        "newbie",
        "beginner",
        "小",
        "小房",
        "小房间",
      ].indexOf(text) >= 0
    ) {
      return 0;
    }
    if (
      [
        "1",
        "middle",
        "medium",
        "expert",
        "mid",
        "中",
        "中房",
        "中房间",
      ].indexOf(text) >= 0
    ) {
      return 1;
    }
    if (
      [
        "2",
        "big",
        "large",
        "high",
        "royal",
        "大",
        "大房",
        "大房间",
      ].indexOf(text) >= 0
    ) {
      return 2;
    }
    return -1;
  }

  function getLobbyRoomSizeLabel(roomEnum) {
    if (0 === roomEnum) {
      return "small";
    }
    if (1 === roomEnum) {
      return "middle";
    }
    if (2 === roomEnum) {
      return "large";
    }
    return "";
  }

  function toSafeSFSInt(value, fallbackValue) {
    var fallback = Math.floor(Number(fallbackValue || 0) || 0);
    var num = Math.floor(Number(value || 0) || 0);
    if (!isFinite(num)) {
      num = fallback;
    }
    if (num < -2147483648 || num > 2147483647) {
      num = fallback;
    }
    if (num < -2147483648) {
      return -2147483648;
    }
    if (num > 2147483647) {
      return 2147483647;
    }
    return num;
  }

  function normalizePreferredRooms(input) {
    var rawList = [];
    if (Array.isArray(input)) {
      rawList = input.slice();
    } else if ("string" == typeof input) {
      rawList = String(input || "")
        .split(/[,\s|]+/)
        .filter(Boolean);
    } else if (void 0 !== input && null !== input) {
      rawList = [input];
    }
    if (!rawList.length) {
      rawList = ["small"];
    }
    var mapped = [];
    for (var i = 0; i < rawList.length; i++) {
      var text = String(rawList[i] || "")
        .trim()
        .toLowerCase();
      var roomEnum = resolveLobbyRoomEnum(text);
      var roomSize = roomEnum >= 0 ? getLobbyRoomSizeLabel(roomEnum) : "";
      if (roomSize && mapped.indexOf(roomSize) < 0) {
        mapped.push(roomSize);
      }
    }
    return mapped.length ? mapped : ["small"];
  }

  function getLobbyAreaLayer() {
    try {
      if (
        "undefined" == typeof Canvas ||
        !Canvas.instance ||
        "function" != typeof Canvas.instance.find
      ) {
        return null;
      }
      return Canvas.instance.find("AreaLayerNode") || null;
    } catch (err) {
      return null;
    }
  }

  function getBattleGuideLayer() {
    try {
      if (
        "undefined" == typeof Canvas ||
        !Canvas.instance ||
        "function" != typeof Canvas.instance.find
      ) {
        return null;
      }
      return Canvas.instance.find("BattleGuideLayerNode") || null;
    } catch (err) {
      return null;
    }
  }

  function getDisplayNodeChildren(node) {
    if (!node) {
      return [];
    }
    if (Array.isArray(node.$children) && node.$children.length) {
      return node.$children.slice();
    }
    if (Array.isArray(node.children) && node.children.length) {
      return node.children.slice();
    }
    var count = Math.max(toInt(node.numChildren, 0), 0);
    if (!(count > 0) || "function" != typeof node.getChildAt) {
      return [];
    }
    var list = [];
    for (var i = 0; i < count; i++) {
      try {
        var child = node.getChildAt(i);
        child && list.push(child);
      } catch (err) {}
    }
    return list;
  }

  function isBattleGuideDisplayNode(node) {
    if (!node) {
      return false;
    }
    return !!(node.maskImage && "function" == typeof node.onTouchBegin);
  }

  function findBattleGuideDisplayNode(root) {
    if (!root) {
      return null;
    }
    var queue = [root];
    for (var i = 0; i < queue.length; i++) {
      var current = queue[i];
      if (!current) {
        continue;
      }
      if (isBattleGuideDisplayNode(current)) {
        return current;
      }
      var nested = getDisplayNodeChildren(current);
      for (var j = 0; j < nested.length; j++) {
        if (nested[j]) {
          queue.push(nested[j]);
        }
      }
    }
    return null;
  }

  function triggerBattleGuideDismiss(component) {
    if (!component) {
      return "";
    }
    try {
      if ("function" == typeof component.onTouchBegin) {
        component.onTouchBegin.call(component, null);
        return "component_onTouchBegin";
      }
    } catch (err) {}
    var maskImage = component.maskImage && "object" == typeof component.maskImage
      ? component.maskImage
      : null;
    if (maskImage) {
      try {
        if (
          "undefined" != typeof egret &&
          egret.TouchEvent &&
          "function" == typeof maskImage.dispatchEventWith
        ) {
          maskImage.dispatchEventWith(egret.TouchEvent.TOUCH_BEGIN, true);
          return "mask_dispatchEventWith";
        }
      } catch (err) {}
      try {
        if (
          "undefined" != typeof egret &&
          egret.TouchEvent &&
          "function" == typeof maskImage.dispatchEvent
        ) {
          maskImage.dispatchEvent(new egret.TouchEvent(egret.TouchEvent.TOUCH_BEGIN, true, false));
          return "mask_dispatchEvent";
        }
      } catch (err) {}
    }
    return "";
  }

  function dismissBattleGuideIfPresent(roomStatus, state, config) {
    if (!roomStatus || !roomStatus.inRoom) {
      return {
        present: false,
        dismissed: false,
        reason: "not_in_room",
      };
    }
    if (config && false === config.autoDismissBattleGuide) {
      return {
        present: false,
        dismissed: false,
        reason: "battle_guide_auto_dismiss_disabled",
      };
    }
    var layer = getBattleGuideLayer();
    var component = findBattleGuideDisplayNode(layer);
    var present = !!(isDisplayNodeVisible(layer) && isDisplayNodeVisible(component));
    if (!present) {
      return {
        present: false,
        dismissed: false,
        reason: "battle_guide_absent",
      };
    }
    var cooldownMs = Math.max(
      toInt(config && config.battleGuideDismissCooldownMs, 1200),
      200
    );
    if (Date.now() - Number(state && state.lastBattleGuideDismissAt || 0) < cooldownMs) {
      return {
        present: true,
        dismissed: false,
        reason: "battle_guide_dismiss_cooldown",
      };
    }
    var maxAttempts = Math.max(
      toInt(config && config.battleGuideDismissMaxAttemptsPerRoom, 3),
      1
    );
    if ((Number(state && state.battleGuideDismissCount || 0) || 0) >= maxAttempts) {
      return {
        present: true,
        dismissed: false,
        reason: "battle_guide_attempts_exhausted",
      };
    }
    var trigger = triggerBattleGuideDismiss(component);
    if (state) {
      state.lastBattleGuideDismissAt = Date.now();
      state.battleGuideDismissCount =
        (Number(state.battleGuideDismissCount || 0) || 0) + 1;
    }
    return {
      present: true,
      dismissed: !!trigger,
      reason: trigger ? "battle_guide_dismissed" : "battle_guide_dismiss_failed",
      trigger: trigger,
      attempts: Number(state && state.battleGuideDismissCount || 0) || 0,
    };
  }

  function buildFallbackLobbyRoomTableData(roomEnum) {
    if (0 === roomEnum) {
      return { id: 0, enumName: "Newbie" };
    }
    if (1 === roomEnum) {
      return { id: 1, enumName: "Expert" };
    }
    if (2 === roomEnum) {
      return { id: 2, enumName: "Royal" };
    }
    return null;
  }

  function resolveLobbyRoomTarget(selector) {
    var normalized = normalizeRoomSelector(selector);
    var roomEnum = -1;
    var sizeValue =
      normalized.roomSize ||
      normalized.size ||
      normalized.roomType ||
      normalized.type ||
      normalized.roomName ||
      normalized.room ||
      normalized.name ||
      "";
    if ("" !== sizeValue) {
      roomEnum = resolveLobbyRoomEnum(sizeValue);
    }
    if (roomEnum < 0) {
      roomEnum = resolveLobbyRoomEnum(normalized.roomId || normalized.id);
    }
    if (roomEnum < 0) {
      return null;
    }
    var roomTableData = null;
    if (
      "undefined" != typeof BaseTableProxy &&
      "function" == typeof BaseTableProxy.getInstance
    ) {
      try {
        var tableProxy = BaseTableProxy.getInstance();
        if (tableProxy && "function" == typeof tableProxy.getRoomTableData) {
          roomTableData = tableProxy.getRoomTableData(roomEnum);
        }
      } catch (err) {}
    }
    if (!roomTableData) {
      roomTableData = buildFallbackLobbyRoomTableData(roomEnum);
    }
    if (!roomTableData) {
      return null;
    }
    return {
      selector: normalized,
      roomEnum: roomEnum,
      roomSize: getLobbyRoomSizeLabel(roomEnum),
      roomTableData: roomTableData,
    };
  }

  function sendQuickRoomLoginProtocol(roomType) {
    if (
      "undefined" == typeof ProtocolEvent ||
      "undefined" == typeof ClientTypeProtocolEnum ||
      "undefined" == typeof CSQuickRoomLoginProtocolData
    ) {
      throw new Error("QuickRoomLogin 依赖未就绪");
    }
    var facade = getFacade();
    if (!facade || "function" != typeof facade.sendNotification) {
      throw new Error("PureMVC Facade 未就绪");
    }
    var resolvedRoomEnum = resolveLobbyRoomEnum(roomType);
    if (resolvedRoomEnum < 0) {
      resolvedRoomEnum = toSafeSFSInt(roomType, -1);
    }
    if (resolvedRoomEnum < 0 || resolvedRoomEnum > 2) {
      throw new Error("QuickRoomLogin roomType 非法: " + String(roomType || ""));
    }
    var protocol = new CSQuickRoomLoginProtocolData();
    protocol.iRoomType = toSafeSFSInt(resolvedRoomEnum, 0);
    facade.sendNotification(ProtocolEvent.NEW_PROTOCOL, [
      ClientTypeProtocolEnum.CSQuickRoomLogin,
      protocol,
    ]);
    return true;
  }

  function sendRoomLogoutProtocol() {
    if (
      "undefined" == typeof ProtocolEvent ||
      "undefined" == typeof ClientTypeProtocolEnum ||
      "undefined" == typeof CSRoomLogoutProtocolData
    ) {
      throw new Error("RoomLogout 依赖未就绪");
    }
    var facade = getFacade();
    if (!facade || "function" != typeof facade.sendNotification) {
      throw new Error("PureMVC Facade 未就绪");
    }
    var protocol = new CSRoomLogoutProtocolData();
    try {
      if (
        "undefined" != typeof DataProxy &&
        DataProxy.getInstance &&
        DataProxy.getInstance() &&
        void 0 !== DataProxy.getInstance().selfPlayerID
      ) {
        protocol.iPlayerID = toSafeSFSInt(DataProxy.getInstance().selfPlayerID, 0);
      }
    } catch (err) {}
    facade.sendNotification(ProtocolEvent.NEW_PROTOCOL, [
      ClientTypeProtocolEnum.CSRoomLogout,
      protocol,
    ]);
    return true;
  }

  function clickLobbyRoom(roomTarget) {
    var layer = getLobbyAreaLayer();
    if (
      layer &&
      "function" == typeof layer.clickEvent &&
      layer.buttonArray &&
      layer.buttonArray[roomTarget.roomEnum]
    ) {
      layer.clickEvent.call(
        [layer, roomTarget.roomTableData],
        { currentTarget: layer.buttonArray[roomTarget.roomEnum] },
        null
      );
      return {
        trigger: "ui_click",
        layerReady: true,
      };
    }
    sendQuickRoomLoginProtocol(roomTarget.roomEnum);
    return {
      trigger: "protocol_notification",
      layerReady: false,
    };
  }

  function clickBattleHomeButton() {
    var battleOptionProxy = getBattleOptionProxyInstance();
    var buttonNode =
      battleOptionProxy && battleOptionProxy.buttonNode
        ? battleOptionProxy.buttonNode
        : null;
    if (!buttonNode || "function" != typeof buttonNode.getComponent) {
      throw new Error("房间内小房子按钮未就绪");
    }
    if ("undefined" == typeof HomeButtonBattleOptionComponent) {
      throw new Error("HomeButtonBattleOptionComponent 不存在");
    }
    var homeComponent = buttonNode.getComponent(HomeButtonBattleOptionComponent);
    if (!homeComponent || "function" != typeof homeComponent.clickHome) {
      throw new Error("未找到房间内小房子按钮组件");
    }
    homeComponent.clickHome.call(homeComponent, {
      currentTarget: buttonNode,
    });
    return {
      trigger: "home_button_click",
      layerReady: true,
    };
  }

  function joinRoom(target) {
    var roomTarget = resolveLobbyRoomTarget(target);
    if (!roomTarget) {
      throw new Error("仅支持大厅小/中/大房间进入");
    }
    var clickResult = clickLobbyRoom(roomTarget);
    return {
      requestedRoom: {
        roomId: roomTarget.roomTableData.id,
        roomType: roomTarget.roomEnum,
        roomEnum: roomTarget.roomEnum,
        roomName: roomTarget.roomTableData.enumName || "",
        roomSize: roomTarget.roomSize,
      },
      trigger: clickResult.trigger,
      layerReady: clickResult.layerReady,
      pending: true,
    };
  }

  function leaveRoom() {
    var clickResult = null;
    var fallbackReason = "";
    try {
      clickResult = clickBattleHomeButton();
    } catch (err) {
      fallbackReason = err && err.message ? err.message : String(err || "");
      sendRoomLogoutProtocol();
      clickResult = {
        trigger: "protocol_notification",
        layerReady: false,
        fallbackReason: fallbackReason,
      };
    }
    return {
      requestedRoom: {
        roomAction: "goLobby",
      },
      trigger: clickResult.trigger,
      layerReady: clickResult.layerReady,
      fallbackReason: clickResult.fallbackReason || "",
      pending: true,
    };
  }

  function inferRoomSizeFromSummary(summary) {
    var text = String(
      (summary && (summary.roomSize || summary.name || summary.groupId || summary.id)) || ""
    )
      .trim()
      .toLowerCase();
    var mapped = resolveLobbyRoomEnum(text);
    if (mapped >= 0) {
      return getLobbyRoomSizeLabel(mapped);
    }
    var roomId = Number(summary && summary.id || 0);
    if (roomId >= 0 && roomId <= 2) {
      return getLobbyRoomSizeLabel(roomId);
    }
    return "";
  }

  function getRoomStatus(preferredRooms) {
    var sfs = getSmartFoxInstance();
    var joinedRooms = getJoinedRoomSummaries(sfs);
    var currentRoom = getCurrentJoinedRoomSummary(joinedRooms);
    var lobbyLayer = getLobbyAreaLayer();
    var battleOptionProxy = getBattleOptionProxyInstance();
    var battleButtonNode =
      battleOptionProxy && battleOptionProxy.buttonNode
        ? battleOptionProxy.buttonNode
        : null;
    var lobbyVisible = isDisplayNodeVisible(lobbyLayer);
    var roomJoinedVisible = !!(currentRoom && currentRoom.isGame);
    var roomUiVisible = isDisplayNodeVisible(battleButtonNode);
    var leaveRejoinPending = !!(
      runtimeState &&
      Number(runtimeState.nextAutoJoinAt || 0) > 0
    );
    var effectiveRoomJoinedVisible = !!(
      roomJoinedVisible &&
      !(leaveRejoinPending && !roomUiVisible)
    );
    var staleRoomUiVisible = !!(
      roomUiVisible &&
      lobbyVisible &&
      !effectiveRoomJoinedVisible
    );
    var inRoom = !!(
      roomUiVisible ||
      (effectiveRoomJoinedVisible && !lobbyVisible)
    );
    if (leaveRejoinPending && lobbyVisible && !roomJoinedVisible) {
      inRoom = false;
    }
    if (leaveRejoinPending && !roomUiVisible && !lobbyVisible) {
      inRoom = false;
    }
    var inLobby = !!(!effectiveRoomJoinedVisible && lobbyVisible);
    var currentRoomSize = inferRoomSizeFromSummary(currentRoom);
    var roomKey = currentRoom
      ? String(
          (void 0 !== currentRoom.id ? currentRoom.id : "") +
            ":" +
            String(currentRoom.name || "")
        )
      : inLobby
        ? "lobby"
        : "unknown";
    var rooms = normalizePreferredRooms(preferredRooms);
    var availableRooms = rooms.map(function (roomSize) {
      var target = resolveLobbyRoomTarget({ roomSize: roomSize });
      return {
        roomSize: roomSize,
        available: !!target,
        roomId: target && target.roomTableData ? Number(target.roomTableData.id) || 0 : 0,
        roomType: target && target.roomTableData ? Number(target.roomTableData.id) || 0 : 0,
        roomEnum: target ? Number(target.roomEnum || 0) || 0 : 0,
        roomName: target && target.roomTableData ? target.roomTableData.enumName || "" : "",
      };
    });
    return {
      status: inRoom ? "room" : inLobby ? "lobby" : "unknown",
      inRoom: inRoom,
      inLobby: inLobby,
      roomJoinedVisible: effectiveRoomJoinedVisible,
      roomUiVisible: roomUiVisible,
      roomReadyForAttack: !!(inRoom && (roomUiVisible || roomJoinedVisible)),
      currentRoom: currentRoom,
      currentRoomSize: currentRoomSize,
      roomKey: roomKey,
      joinedRooms: joinedRooms,
      availableRooms: availableRooms,
      preferredRooms: rooms,
    };
  }

  function getFishDisplayName(data, tableData) {
    return String(
      (tableData &&
        (tableData.name ||
          tableData.symbolName ||
          tableData.fishName ||
          tableData.fishSlotName ||
          tableData.fishTextureName)) ||
        (data && data.symbolID ? "Symbol" + String(data.symbolID) : "")
    ).trim();
  }

  function getFishDistanceScore(point) {
    var centerX =
      "number" == typeof window.innerWidth && window.innerWidth > 0
        ? window.innerWidth / 2
        : 0;
    var centerY =
      "number" == typeof window.innerHeight && window.innerHeight > 0
        ? window.innerHeight / 2
        : 0;
    if (!point || (!centerX && !centerY)) {
      return 0;
    }
    var dx = Number(point.x || 0) - centerX;
    var dy = Number(point.y || 0) - centerY;
    return dx * dx + dy * dy;
  }

  function getDistanceOpenFireScore(distanceScore) {
    var centerX =
      "number" == typeof window.innerWidth && window.innerWidth > 0
        ? window.innerWidth / 2
        : 960;
    var centerY =
      "number" == typeof window.innerHeight && window.innerHeight > 0
        ? window.innerHeight / 2
        : 540;
    var maxDistanceScore = centerX * centerX + centerY * centerY;
    var normalized =
      maxDistanceScore > 0
        ? 1 - Math.min(Math.max(Number(distanceScore || 0), 0) / maxDistanceScore, 1)
        : 0;
    return Math.max(Math.round(normalized * 40), 0);
  }

  function pushOddsNumbers(source, list) {
    if (!list || null == source || void 0 === source) {
      return;
    }
    if ("number" == typeof source) {
      if (isFinite(source) && source > 0) {
        list.push(Number(source));
      }
      return;
    }
    if ("string" == typeof source) {
      var text = String(source || "").trim();
      if (!text) {
        return;
      }
      var pieces = text.split(/[^0-9.]+/);
      for (var i = 0; i < pieces.length; i++) {
        var num = Number(pieces[i]);
        if (isFinite(num) && num > 0) {
          list.push(num);
        }
      }
      return;
    }
    if (Array.isArray(source)) {
      for (var j = 0; j < source.length; j++) {
        pushOddsNumbers(source[j], list);
      }
      return;
    }
    if ("object" == typeof source) {
      if (hasOwn(source, "odds")) {
        pushOddsNumbers(source.odds, list);
      }
      if (hasOwn(source, "value")) {
        pushOddsNumbers(source.value, list);
      }
      if (hasOwn(source, "min") || hasOwn(source, "max")) {
        pushOddsNumbers([source.min, source.max], list);
      }
    }
  }

  function buildOddsStatsFromSources(sources) {
    var values = [];
    var sourceList = Array.isArray(sources) ? sources : [sources];
    for (var i = 0; i < sourceList.length; i++) {
      pushOddsNumbers(sourceList[i], values);
    }
    if (!values.length) {
      return {
        available: false,
        min: 0,
        max: 0,
        avg: 0,
        text: "",
      };
    }
    var min = values[0];
    var max = values[0];
    var sum = 0;
    for (var j = 0; j < values.length; j++) {
      var item = Number(values[j] || 0) || 0;
      if (item < min) {
        min = item;
      }
      if (item > max) {
        max = item;
      }
      sum += item;
    }
    return {
      available: true,
      min: min,
      max: max,
      avg: values.length ? Math.round((sum / values.length) * 100) / 100 : 0,
      text: min === max ? String(max) : String(min) + "-" + String(max),
    };
  }

  function getFishOddsStats(data, tableData) {
    return buildOddsStatsFromSources([
      data && data.odds,
      data && data.odd,
      data && data.oddsRange,
      tableData && tableData.odds,
      tableData && tableData.odd,
      tableData && tableData.multiple,
      tableData && tableData.minOdds,
      tableData && tableData.maxOdds,
    ]);
  }

  function getFishNativeCanAttack(data) {
    try {
      var attackControlProxy = getAttackControlProxyInstance();
      var bulletType = getSelfFortBulletType();
      var sn = Number(data && data.sn ? data.sn : 0) || 0;
      var tableEntityID = Number(data && data.tableEntityID ? data.tableEntityID : 0) || 0;
      if (
        !attackControlProxy ||
        "function" != typeof attackControlProxy.canAttack ||
        !sn ||
        !tableEntityID ||
        null == bulletType
      ) {
        return {
          available: false,
          canAttack: false,
          bulletType: null == bulletType ? null : bulletType,
        };
      }
      return {
        available: true,
        canAttack: !!attackControlProxy.canAttack(sn, tableEntityID, bulletType),
        bulletType: bulletType,
      };
    } catch (err) {
      return {
        available: false,
        canAttack: false,
        bulletType: null,
      };
    }
  }

  function getCurrentScreenFishCandidates() {
    if (
      "undefined" == typeof SymbolProxy ||
      "undefined" == typeof GameUtil ||
      "undefined" == typeof LockPointSymbolComponent ||
      "undefined" == typeof SymbolComponent
    ) {
      return [];
    }
    var proxy =
      SymbolProxy && "function" == typeof SymbolProxy.getInstance
        ? SymbolProxy.getInstance()
        : null;
    if (!proxy || "function" != typeof proxy.getSymbolMap) {
      return [];
    }
    var symbolMap = proxy.getSymbolMap();
    var nodes =
      symbolMap && "function" == typeof symbolMap.values
        ? symbolMap.values()
        : [];
    var result = [];
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!node || "function" != typeof node.getComponent) {
        continue;
      }
      var lockComponent = node.getComponent(LockPointSymbolComponent);
      var symbolComponent = node.getComponent(SymbolComponent);
      if (!lockComponent || !symbolComponent) {
        continue;
      }
      var point =
        "function" == typeof lockComponent.getLockPoint
          ? lockComponent.getLockPoint()
          : null;
      if (!point || !GameUtil.isInScreen(point.x, point.y, 0, 0)) {
        continue;
      }
      var canTouch =
        "function" == typeof symbolComponent.canTouch
          ? !!symbolComponent.canTouch()
          : true;
      if (!canTouch) {
        continue;
      }
      var data =
        "function" == typeof symbolComponent.getData
          ? symbolComponent.getData()
          : null;
      if (!data) {
        continue;
      }
      var tableData =
        "function" == typeof symbolComponent.getSymbolTableData
          ? symbolComponent.getSymbolTableData()
          : null;
      var oddsStats = getFishOddsStats(data, tableData);
      var nativeCanAttack = getFishNativeCanAttack(data);
      result.push({
        node: node,
        point: point,
        data: data,
        tableData: tableData,
        canTouch: canTouch,
        name: getFishDisplayName(data, tableData),
        sn: Number(data.sn || 0) || 0,
        tableEntityID: Number(data.tableEntityID || 0) || 0,
        symbolID: Number(data.symbolID || 0) || 0,
        fishKind: Number(data.fishKind || (tableData && tableData.fishKind) || (tableData && tableData.kind) || 0) || 0,
        subFishKind:
          Number(data.subFishKind || (tableData && tableData.subFishKind) || 0) || 0,
        x: Number(point.x || 0) || 0,
        y: Number(point.y || 0) || 0,
        distanceScore: getFishDistanceScore(point),
        distanceOpenFireScore: 0,
        oddsAvailable: !!oddsStats.available,
        oddsMin: Number(oddsStats.min || 0) || 0,
        oddsMax: Number(oddsStats.max || 0) || 0,
        oddsAvg: Number(oddsStats.avg || 0) || 0,
        oddsText: String(oddsStats.text || ""),
        nativeCanAttack: nativeCanAttack.available
          ? !!nativeCanAttack.canAttack
          : true,
        nativeCanAttackAvailable: !!nativeCanAttack.available,
      });
    }
    for (var j = 0; j < result.length; j++) {
      result[j].distanceOpenFireScore = getDistanceOpenFireScore(result[j].distanceScore);
    }
    return result;
  }

  function getCurrentScreenFish() {
    var candidates = getCurrentScreenFishCandidates();
    return candidates.map(function (item) {
      return {
        sn: item.sn,
        tableEntityID: item.tableEntityID,
        symbolID: item.symbolID,
        x: item.x,
        y: item.y,
        canTouch: item.canTouch,
        nativeCanAttack: item.nativeCanAttack,
        nativeCanAttackAvailable: item.nativeCanAttackAvailable,
        distanceScore: item.distanceScore,
        distanceOpenFireScore: item.distanceOpenFireScore,
        oddsAvailable: item.oddsAvailable,
        oddsMin: item.oddsMin,
        oddsMax: item.oddsMax,
        oddsAvg: item.oddsAvg,
        oddsText: item.oddsText,
        name: item.name,
      };
    });
  }

  function includesNumber(list, value) {
    if (!Array.isArray(list)) {
      return false;
    }
    var target = Number(value || 0) || 0;
    for (var i = 0; i < list.length; i++) {
      if ((Number(list[i] || 0) || 0) === target) {
        return true;
      }
    }
    return false;
  }

  function includesKeyword(list, value) {
    if (!Array.isArray(list)) {
      return false;
    }
    var target = String(value || "").trim().toLowerCase();
    if (!target) {
      return false;
    }
    for (var i = 0; i < list.length; i++) {
      var keyword = String(list[i] || "").trim().toLowerCase();
      if (keyword && target.indexOf(keyword) >= 0) {
        return true;
      }
    }
    return false;
  }

  function isExplicitPrecisionWhitelistTarget(config, targetId) {
    var normalizedTargetId = Number(targetId || 0) || 0;
    if (!(normalizedTargetId > 0)) {
      return false;
    }
    return !!(
      includesNumber(config && config.precisionPrimaryTargetIds, normalizedTargetId) ||
      includesNumber(config && config.precisionSecondaryTargetIds, normalizedTargetId) ||
      includesNumber(config && config.targetFishIds, normalizedTargetId) ||
      includesNumber(BUILT_IN_PRIMARY_TARGET_IDS, normalizedTargetId) ||
      includesNumber(BUILT_IN_SECONDARY_TARGET_IDS, normalizedTargetId)
    );
  }

  function isSpecialEventCandidate(config, candidate) {
    var item = pickObject(candidate);
    var targetId = Number(item.tableEntityID || 0) || 0;
    var symbolID = Number(item.symbolID || 0) || 0;
    var fishKind = Number(item.fishKind || 0) || 0;
    var name = String(item.name || "").trim();
    return !!(
      includesNumber(config && config.specialEventFishKinds, fishKind) ||
      includesNumber(config && config.specialEventTargetIds, targetId) ||
      includesNumber(config && config.specialEventSymbolIds, symbolID) ||
      includesKeyword(config && config.specialEventNameKeywords, name)
    );
  }

  function isBlockedRoomLeaveReason(config, reason) {
    var blockedReasons = Array.isArray(config && config.blockedRoomLeaveReasons)
      ? config.blockedRoomLeaveReasons
      : [];
    var normalized = String(reason || "").trim();
    if (!normalized) {
      return false;
    }
    return includesKeyword(blockedReasons, normalized);
  }

  function isCandidatePrecisionBlacklisted(config, candidate) {
    var item = pickObject(candidate);
    var targetId = Number(item.tableEntityID || 0) || 0;
    var symbolID = Number(item.symbolID || 0) || 0;
    var name = String(item.name || "").trim();
    var minBlacklistedTargetId = Math.max(
      toInt(config && config.precisionBlacklistMinTargetId, 100),
      0
    );
    var minBlacklistedSymbolId = Math.max(
      toInt(config && config.precisionBlacklistMinSymbolId, 100),
      0
    );
    var explicitWhitelistTarget = isExplicitPrecisionWhitelistTarget(config, targetId);
    return !!(
      (!explicitWhitelistTarget && targetId > 0 && targetId >= minBlacklistedTargetId) ||
      (symbolID > 0 && symbolID >= minBlacklistedSymbolId) ||
      includesNumber(config && config.precisionBlacklistTargetIds, targetId) ||
      includesNumber(config && config.precisionBlacklistTargetIds, symbolID) ||
      includesNumber(runtimeState && runtimeState.adaptiveBlacklistTargetIds, targetId) ||
      includesNumber(config && config.precisionBlacklistSymbolIds, symbolID) ||
      includesKeyword(config && config.precisionBlacklistNameKeywords, name)
    );
  }

  function isCandidateProfitOddsBlocked(config, candidate) {
    var oddsMax = Number(candidate && candidate.oddsMax || 0) || 0;
    var targetId = Number(
      candidate && (candidate.tableEntityID || candidate.symbolID || 0)
    ) || 0;
    return !!(
      (targetId > 0 &&
        targetId === Number(runtimeState && runtimeState.recentMissBlockedTargetId || 0) &&
        Date.now() < (Number(runtimeState && runtimeState.recentMissBlockedTargetUntil || 0) || 0)) ||
      includesNumber(config && config.precisionBlacklistOdds, oddsMax) ||
      includesNumber(runtimeState && runtimeState.adaptiveBlacklistOdds, oddsMax)
    );
  }

  function ensureAdaptiveBlacklistState(state) {
    if (!state || "object" != typeof state) {
      return null;
    }
    if (!state.targetOutcomeStats || "object" != typeof state.targetOutcomeStats) {
      state.targetOutcomeStats = {};
    }
    if (!state.oddsOutcomeStats || "object" != typeof state.oddsOutcomeStats) {
      state.oddsOutcomeStats = {};
    }
    if (!Array.isArray(state.adaptiveBlacklistTargetIds)) {
      state.adaptiveBlacklistTargetIds = [];
    }
    if (!Array.isArray(state.adaptiveBlacklistOdds)) {
      state.adaptiveBlacklistOdds = [];
    }
    return state;
  }

  function pushUniqueNumber(list, value) {
    if (!Array.isArray(list)) {
      return false;
    }
    var nextValue = Number(value || 0) || 0;
    if (!(nextValue >= 0) || includesNumber(list, nextValue)) {
      return false;
    }
    list.push(nextValue);
    list.sort(function (a, b) {
      return Number(a || 0) - Number(b || 0);
    });
    return true;
  }

  function mergeUniqueNumberLists(base, extra) {
    var result = Array.isArray(base) ? cloneArray(base) : [];
    var list = Array.isArray(extra) ? extra : [];
    for (var i = 0; i < list.length; i++) {
      pushUniqueNumber(result, list[i]);
    }
    return result;
  }

  function updateOutcomeStatBucket(bucket, key, betRaw, totalWinRaw, isHit) {
    if (!bucket || !key) {
      return null;
    }
    if (!bucket[key] || "object" != typeof bucket[key]) {
      bucket[key] = {
        sampleCount: 0,
        hitCount: 0,
        totalBetRaw: 0,
        totalWinRaw: 0,
      };
    }
    bucket[key].sampleCount = (Number(bucket[key].sampleCount || 0) || 0) + 1;
    bucket[key].hitCount = (Number(bucket[key].hitCount || 0) || 0) + (isHit ? 1 : 0);
    bucket[key].totalBetRaw = (Number(bucket[key].totalBetRaw || 0) || 0) + (Number(betRaw || 0) || 0);
    bucket[key].totalWinRaw = (Number(bucket[key].totalWinRaw || 0) || 0) + (Number(totalWinRaw || 0) || 0);
    return bucket[key];
  }

  function shouldAutoBlacklistOutcomeStat(stat, minSamples, maxRtpRatio) {
    var sampleCount = Number(stat && stat.sampleCount || 0) || 0;
    var totalBetRaw = Number(stat && stat.totalBetRaw || 0) || 0;
    var totalWinRaw = Number(stat && stat.totalWinRaw || 0) || 0;
    if (!(sampleCount >= Math.max(toInt(minSamples, 5), 1)) || !(totalBetRaw > 0)) {
      return false;
    }
    return totalWinRaw / totalBetRaw <= clamp(toNumber(maxRtpRatio, 0.05), 0, 1);
  }

  function ensureRoomTemporaryTargetBlockState(state) {
    if (!state || "object" != typeof state) {
      return null;
    }
    if (!state.roomTargetOutcomeStats || "object" != typeof state.roomTargetOutcomeStats) {
      state.roomTargetOutcomeStats = {};
    }
    if (!Array.isArray(state.roomTemporaryBlockedTargetIds)) {
      state.roomTemporaryBlockedTargetIds = [];
    }
    return state;
  }

  function isRoomTemporaryBlockedTarget(state, targetId) {
    var normalizedTargetId = Number(targetId || 0) || 0;
    return !!(
      normalizedTargetId > 0 &&
      Array.isArray(state && state.roomTemporaryBlockedTargetIds) &&
      includesNumber(state.roomTemporaryBlockedTargetIds, normalizedTargetId)
    );
  }

  function updateRoomTemporaryTargetBlocksFromOutcome(state, outcome, config) {
    if (!state || !outcome || !config || false === config.roomTemporaryTargetBlockEnabled) {
      return false;
    }
    ensureRoomTemporaryTargetBlockState(state);
    var targetId = Number(outcome.targetId || 0) || 0;
    var betRaw = Number(outcome.betRaw || 0) || 0;
    var totalWinRaw = Number(outcome.totalWinRaw || 0) || 0;
    var hit = (Number(outcome.killCount || 0) || 0) > 0 || totalWinRaw > 0;
    if (!(targetId > 0)) {
      return false;
    }
    var stat = updateOutcomeStatBucket(
      state.roomTargetOutcomeStats,
      String(targetId),
      betRaw,
      totalWinRaw,
      hit
    );
    if (
      shouldAutoBlacklistOutcomeStat(
        stat,
        config.roomTemporaryTargetBlockMinSamples,
        config.roomTemporaryTargetBlockMaxRtpRatio
      )
    ) {
      var changed = pushUniqueNumber(state.roomTemporaryBlockedTargetIds, targetId);
      if (changed) {
        state.latestRoomTemporaryBlockedTarget = buildOutcomeStatSummary(targetId, stat);
      }
      return changed;
    }
    return false;
  }

  function persistAdaptiveBlacklistConfig(state, config) {
    if (!state || !config) {
      return;
    }
    var mergedTargets = mergeUniqueNumberLists(
      config.precisionBlacklistTargetIds,
      state.adaptiveBlacklistTargetIds
    );
    var mergedOdds = mergeUniqueNumberLists(
      config.precisionBlacklistOdds,
      state.adaptiveBlacklistOdds
    );
    config.precisionBlacklistTargetIds = mergedTargets;
    config.precisionBlacklistOdds = mergedOdds;
    writeLocalSettings({
      precisionBlacklistTargetIds: mergedTargets,
      precisionBlacklistOdds: mergedOdds,
    });
  }

  function updateAdaptiveBlacklistsFromOutcome(state, outcome, config) {
    if (
      !state ||
      !outcome ||
      !config ||
      false === config.adaptiveBlacklistEnabled
    ) {
      return false;
    }
    ensureAdaptiveBlacklistState(state);
    var changed = false;
    var targetId = Number(outcome.targetId || 0) || 0;
    var oddRaw = Number(outcome.oddRaw || 0) || 0;
    var betRaw = Number(outcome.betRaw || 0) || 0;
    var totalWinRaw = Number(outcome.totalWinRaw || 0) || 0;
    var hit = (Number(outcome.killCount || 0) || 0) > 0 || totalWinRaw > 0;
    if (targetId > 0) {
      var targetTier = getPrecisionTargetTier(config, targetId);
      var targetStat = updateOutcomeStatBucket(
        state.targetOutcomeStats,
        String(targetId),
        betRaw,
        totalWinRaw,
        hit
      );
      if (
        !isWhitelistPrecisionTier(targetTier) &&
        !includesNumber(config.precisionBlacklistTargetIds, targetId) &&
        shouldAutoBlacklistOutcomeStat(
          targetStat,
          config.adaptiveBlacklistTargetMinSamples,
          config.adaptiveBlacklistTargetMaxRtpRatio
        )
      ) {
        changed = pushUniqueNumber(state.adaptiveBlacklistTargetIds, targetId) || changed;
        state.latestAdaptiveBlacklistTarget = buildOutcomeStatSummary(targetId, targetStat);
      }
    }
    if (
      oddRaw >= 0 &&
      !includesNumber(BUILT_IN_PROFIT_PRESERVE_ODDS, oddRaw)
    ) {
      var oddStat = updateOutcomeStatBucket(
        state.oddsOutcomeStats,
        String(oddRaw),
        betRaw,
        totalWinRaw,
        hit
      );
      if (
        !includesNumber(config.precisionBlacklistOdds, oddRaw) &&
        shouldAutoBlacklistOutcomeStat(
          oddStat,
          config.adaptiveBlacklistOddMinSamples,
          config.adaptiveBlacklistOddMaxRtpRatio
        )
      ) {
        changed = pushUniqueNumber(state.adaptiveBlacklistOdds, oddRaw) || changed;
        state.latestAdaptiveBlacklistOdd = buildOutcomeStatSummary(oddRaw, oddStat);
      }
    }
    if (changed) {
      state.lastAdaptiveBlacklistAt = Date.now();
      persistAdaptiveBlacklistConfig(state, config);
    }
    return changed;
  }

  function getPrecisionTargetTier(config, targetId) {
    var normalizedTargetId = Number(targetId || 0) || 0;
    var minBlacklistedTargetId = Math.max(
      toInt(config && config.precisionBlacklistMinTargetId, 100),
      0
    );
    var explicitWhitelistTarget = isExplicitPrecisionWhitelistTarget(config, normalizedTargetId);
    if (!(normalizedTargetId > 0)) {
      return "invalid";
    }
    if (!explicitWhitelistTarget && normalizedTargetId >= minBlacklistedTargetId) {
      return "blacklist";
    }
    if (includesNumber(config.precisionBlacklistTargetIds, normalizedTargetId)) {
      return "blacklist";
    }
    if (
      includesNumber(config.precisionPrimaryTargetIds, normalizedTargetId) ||
      includesNumber(config.targetFishIds, normalizedTargetId) ||
      includesNumber(BUILT_IN_PRIMARY_TARGET_IDS, normalizedTargetId)
    ) {
      return "primary";
    }
    if (
      includesNumber(config.precisionSecondaryTargetIds, normalizedTargetId) ||
      includesNumber(BUILT_IN_SECONDARY_TARGET_IDS, normalizedTargetId)
    ) {
      return "secondary";
    }
    if (false !== config.dynamicTargeting) {
      return "neutral";
    }
    return "neutral";
  }

  function getPrecisionTierBonus(tier) {
    if ("primary" === tier) {
      return 40;
    }
    if ("secondary" === tier) {
      return 18;
    }
    if ("blacklist" === tier || "invalid" === tier) {
      return -120;
    }
    return 0;
  }

  function getCurrentObservationHourSlot(nowTs) {
    var current = new Date(Number(nowTs || Date.now()) || Date.now());
    return String(current.getHours()).padStart(2, "0");
  }

  function getObservationHourBonus(config, nowTs) {
    var hourSlot = getCurrentObservationHourSlot(nowTs);
    if (includesKeyword(config && config.hotObservationHourSlots, hourSlot)) {
      return {
        slot: hourSlot,
        tier: "hot",
        scoreBonus: Math.max(toNumber(config && config.hotObservationHourScoreBonus, 8), 0),
      };
    }
    if (includesKeyword(config && config.warmObservationHourSlots, hourSlot)) {
      return {
        slot: hourSlot,
        tier: "warm",
        scoreBonus: Math.max(toNumber(config && config.warmObservationHourScoreBonus, 4), 0),
      };
    }
    return {
      slot: hourSlot,
      tier: "",
      scoreBonus: 0,
    };
  }

  function getObservationTargetBonus(config, targetId) {
    var normalizedTargetId = Number(targetId || 0) || 0;
    if (!(normalizedTargetId > 0)) {
      return {
        tier: "",
        scoreBonus: 0,
      };
    }
    if (includesNumber(config && config.hotObservationTargetIds, normalizedTargetId)) {
      return {
        tier: "hot",
        scoreBonus: Math.max(toNumber(config && config.hotObservationTargetScoreBonus, 10), 0),
      };
    }
    if (includesNumber(config && config.warmObservationTargetIds, normalizedTargetId)) {
      return {
        tier: "warm",
        scoreBonus: Math.max(toNumber(config && config.warmObservationTargetScoreBonus, 5), 0),
      };
    }
    return {
      tier: "",
      scoreBonus: 0,
    };
  }

  function isWhitelistPrecisionTier(tier) {
    return "primary" === tier || "secondary" === tier;
  }

  function getCandidateIdentityText(candidate, scoreInfo) {
    var item = pickObject(candidate);
    var score = pickObject(scoreInfo || item.scoreInfo);
    var parts = [];
    var name = String(item.name || "").trim();
    parts.push(name || "未命名鱼");
    if ((Number(item.tableEntityID || 0) || 0) > 0) {
      parts.push("targetId=" + String(Number(item.tableEntityID || 0) || 0));
    }
    if ((Number(item.sn || 0) || 0) > 0) {
      parts.push("sn=" + String(Number(item.sn || 0) || 0));
    }
    if ((Number(item.symbolID || 0) || 0) > 0) {
      parts.push("symbolID=" + String(Number(item.symbolID || 0) || 0));
    }
    if (score.tier) {
      parts.push("tier=" + String(score.tier));
    }
    return parts.join(" / ");
  }

  function allowProbeForEmptyOddsCandidate(candidate, scoreInfo, config) {
    var info = pickObject(scoreInfo);
    var item = pickObject(candidate);
    if (!config.allowEmptyOddsProbeForNeutral) {
      return false;
    }
    if (Number(item.oddsMax || 0) > 0) {
      return false;
    }
    if (isWhitelistPrecisionTier(String(info.tier || ""))) {
      return false;
    }
    if (
      Number(info.captureStats && info.captureStats.consecutiveSeenTicks || 0) <
      Math.max(toInt(config.emptyOddsProbeMinStableSeenTicks, 3), 1)
    ) {
      return false;
    }
    if (
      Number(item.score || info.score || 0) <
      Math.max(toNumber(config.emptyOddsProbeMinCandidateScore, 92), 1)
    ) {
      return false;
    }
    if (
      Number(info.hitProbability || 0) <
      Math.max(toNumber(config.emptyOddsProbeMinHitProbability, 66), 1)
    ) {
      return false;
    }
    if (
      Number(item.distanceOpenFireScore || 0) <
      Math.max(toNumber(config.emptyOddsProbeMinDistanceOpenFireScore, 24), 0)
    ) {
      return false;
    }
    if (
      item.nativeCanAttackAvailable &&
      !item.nativeCanAttack
    ) {
      return false;
    }
    return true;
  }

  function canAllowWarmingNeutralProbe(candidate, scoreInfo, state, config) {
    var item = pickObject(candidate);
    var info = pickObject(scoreInfo);
    var profile = pickObject(state && state.platformWaterProfile);
    var level = String(profile.level || "");
    var roomResolvedShotCount = Math.max(toInt(state && state.roomResolvedShotCount, 0), 0);
    var roomResolvedHitCount = Math.max(toInt(state && state.roomResolvedHitCount, 0), 0);
    var consecutiveMissShots = Math.max(toInt(state && state.consecutiveMissShots, 0), 0);
    var roomProfitRaw = Number(state && state.roomProfitRaw || 0) || 0;
    var usablePeerNetRatio = getPlatformUsablePeerNetRatio(profile);
    var waterActionGuard = buildPlatformWaterActionGuard(state, config);
    if (!config.allowWarmingNeutralProbe) {
      return false;
    }
    if (waterActionGuard.hardBlocked || !waterActionGuard.directFireReady) {
      return false;
    }
    if ("warming" !== level && "open_suspected" !== level) {
      return false;
    }
    if (Number(item.oddsMax || 0) > 0) {
      return false;
    }
    if ("neutral" !== String(info.tier || "")) {
      return false;
    }
    if (
      roomResolvedHitCount <= 0 &&
      (roomResolvedShotCount > 0 || consecutiveMissShots > 0 || roomProfitRaw < 0)
    ) {
      return false;
    }
    if (
      Number(info.score || 0) <
      Math.max(toNumber(config.warmingNeutralProbeMinCandidateScore, 90), 1)
    ) {
      return false;
    }
    if (
      Number(info.hitProbability || 0) <
      Math.max(toNumber(config.warmingNeutralProbeMinHitProbability, 97), 1)
    ) {
      return false;
    }
    if (
      Number(info.captureStats && info.captureStats.consecutiveSeenTicks || 0) <
      Math.max(toInt(config.warmingNeutralProbeMinStableSeenTicks, 4), 1)
    ) {
      return false;
    }
    if (
      Number(profile.score || 0) <
      Math.max(toNumber(config.warmingNeutralProbeMinWaterScore, 34), 1)
    ) {
      return false;
    }
    if (
      Number(profile.highOddRate || 0) <
      clamp(toNumber(config.warmingNeutralProbeMinHighOddRate, 0.58), 0.1, 1)
    ) {
      return false;
    }
    if (
      usablePeerNetRatio <
      clamp(toNumber(config.warmingNeutralProbeMinPeerNetRatio, 0), -1, 5)
    ) {
      return false;
    }
    var mechanismReady =
      Number(profile.highMechanismRate || 0) >=
      clamp(toNumber(config.warmingNeutralProbeMinHighMechanismRate, 0.03), 0, 1);
    var fallbackReady = !!(
      Number(profile.score || 0) >=
        Math.max(toNumber(config.warmingNeutralProbeFallbackWaterScore, 39), 1) &&
      usablePeerNetRatio >=
        clamp(toNumber(config.warmingNeutralProbeFallbackPeerNetRatio, 0.05), -1, 5) &&
      Number(profile.highOddRate || 0) >=
        clamp(toNumber(config.warmingNeutralProbeFallbackHighOddRate, 0.52), 0.1, 1)
    );
    if (!mechanismReady && !fallbackReady) {
      return false;
    }
    if (
      Number(item.distanceOpenFireScore || 0) <
      Math.max(toNumber(config.warmingNeutralProbeMinDistanceOpenFireScore, 28), 0)
    ) {
      return false;
    }
    if (item.nativeCanAttackAvailable && !item.nativeCanAttack) {
      return false;
    }
    if (getActivePendingFireCount(state) > 0) {
      return false;
    }
    return true;
  }

  function canAllowWarmingEmptyOddsPrecision(candidate, scoreInfo, state, config) {
    var item = pickObject(candidate);
    var info = pickObject(scoreInfo);
    var profile = pickObject(state && state.platformWaterProfile);
    var level = String(profile.level || "");
    var specialEventCandidate = !!(info.specialEventCandidate || isSpecialEventCandidate(config, item));
    var specialStableRelax = specialEventCandidate
      ? Math.max(toInt(config && config.specialEventStableSeenTicksRelax, 2), 0)
      : 0;
    var specialWaterRelax = specialEventCandidate
      ? Math.max(toNumber(config && config.specialEventWaterScoreRelax, 6), 0)
      : 0;
    var specialHighOddRelax = specialEventCandidate
      ? clamp(toNumber(config && config.specialEventHighOddRateRelax, 0.12), 0, 0.5)
      : 0;
    var specialHighMechanismRelax = specialEventCandidate
      ? clamp(toNumber(config && config.specialEventHighMechanismRateRelax, 0.04), 0, 0.5)
      : 0;
    var commitActive = Number(state && state.warmingEmptyOddsCommitUntil || 0) > Date.now();
    var stayMs = Number(state && state.roomEnteredAt || 0) > 0 ? Date.now() - Number(state.roomEnteredAt || 0) : 0;
    var roomResolvedShotCount = Number(state && state.roomResolvedShotCount || 0) || 0;
    var roomResolvedHitCount = Number(state && state.roomResolvedHitCount || 0) || 0;
    var consecutiveMissShots = Number(state && state.consecutiveMissShots || 0) || 0;
    var roomProfitRaw = Number(state && state.roomProfitRaw || 0) || 0;
    var usablePeerNetRatio = getPlatformUsablePeerNetRatio(profile);
    var waterActionGuard = buildPlatformWaterActionGuard(state, config);
    var waitedLongEnough =
      stayMs >= Math.max(toInt(config.warmingEmptyOddsMinRoomStaySeconds, 18), 0) * 1000;
    var minCandidateScore = Math.max(
      toNumber(
        waitedLongEnough
          ? config.warmingEmptyOddsWaitedMinCandidateScore
          : config.warmingEmptyOddsMinCandidateScore,
        waitedLongEnough ? 92 : 94
      ),
      1
    );
    var minHitProbability = Math.max(
      toNumber(
        waitedLongEnough
          ? config.warmingEmptyOddsWaitedMinHitProbability
          : config.warmingEmptyOddsMinHitProbability,
        waitedLongEnough ? 98 : 98
      ),
      1
    );
    var minStableSeenTicks = Math.max(
      toInt(
        waitedLongEnough
          ? config.warmingEmptyOddsWaitedMinStableSeenTicks
          : config.warmingEmptyOddsMinStableSeenTicks,
        waitedLongEnough ? 6 : 8
      ) - specialStableRelax,
      1
    );
    var minWaterScore = Math.max(
      toNumber(
        waitedLongEnough
          ? config.warmingEmptyOddsWaitedMinWaterScore
          : config.warmingEmptyOddsMinWaterScore,
        waitedLongEnough ? 50 : 60
      ) - specialWaterRelax,
      1
    );
    var minHighOddRate = clamp(
      toNumber(
        waitedLongEnough
          ? config.warmingEmptyOddsWaitedMinHighOddRate
          : config.warmingEmptyOddsMinHighOddRate,
        waitedLongEnough ? 0.6 : 0.67
      ) - specialHighOddRelax,
      0.1,
      1
    );
    var minHighMechanismRate = clamp(
      toNumber(
        waitedLongEnough
          ? config.warmingEmptyOddsWaitedMinHighMechanismRate
          : config.warmingEmptyOddsMinHighMechanismRate,
        waitedLongEnough ? 0.08 : 0.12
      ) - specialHighMechanismRelax,
      0,
      1
    );
    var strongHotWindowReady = !!(
      !commitActive &&
      ("warming" === level || "open_suspected" === level) &&
      Number(info.score || 0) >=
        Math.max(toNumber(config.warmingEmptyOddsStrongHotMinCandidateScore, 94), 1) &&
      Number(info.hitProbability || 0) >=
        Math.max(toNumber(config.warmingEmptyOddsStrongHotMinHitProbability, 98), 1) &&
      Number(info.captureStats && info.captureStats.consecutiveSeenTicks || 0) >=
        Math.max(
          Math.max(toInt(config.warmingEmptyOddsStrongHotMinStableSeenTicks, 16), 1) - specialStableRelax,
          1
        ) &&
      Number(profile.score || 0) >=
        Math.max(toNumber(config.warmingEmptyOddsStrongHotMinWaterScore, 52) - specialWaterRelax, 1) &&
      Number(profile.highOddRate || 0) >=
        clamp(toNumber(config.warmingEmptyOddsStrongHotMinHighOddRate, 0.58) - specialHighOddRelax, 0.1, 1) &&
      usablePeerNetRatio >=
        clamp(toNumber(config.warmingEmptyOddsStrongHotMinPeerNetRatio, -0.05), -1, 5)
    );
    if (!config.allowWarmingEmptyOddsPrecision) {
      return false;
    }
    if (waterActionGuard.hardBlocked || !waterActionGuard.directFireReady) {
      return false;
    }
    if (!commitActive && "warming" !== level && "open_suspected" !== level) {
      return false;
    }
    if (Number(item.oddsMax || 0) > 0) {
      return false;
    }
    if (isWhitelistPrecisionTier(String(info.tier || ""))) {
      return false;
    }
    if ("neutral" !== String(info.tier || "")) {
      return false;
    }
    if (
      Math.max(toInt(state && state.roomWarmingEmptyOddsFireCount, 0), 0) >=
      Math.max(toInt(config.warmingEmptyOddsMaxShotsPerRoom, 1), 0)
    ) {
      return false;
    }
    if (getActivePendingFireCount(state) > 0) {
      return false;
    }
    if (
      roomResolvedHitCount <= 0 &&
      (consecutiveMissShots > 0 || (roomResolvedShotCount > 0 && roomProfitRaw < 0))
    ) {
      return false;
    }
    if (commitActive) {
      if (
        Number(info.score || 0) <
        Math.max(toNumber(config.warmingEmptyOddsCommitMinCandidateScore, 91), 1)
      ) {
        return false;
      }
      if (
        Number(info.hitProbability || 0) <
        Math.max(toNumber(config.warmingEmptyOddsCommitMinHitProbability, 98), 1)
      ) {
        return false;
      }
      if (
        Number(info.captureStats && info.captureStats.consecutiveSeenTicks || 0) <
        Math.max(
          Math.max(toInt(config.warmingEmptyOddsCommitMinStableSeenTicks, 6), 1) - specialStableRelax,
          1
        )
      ) {
        return false;
      }
      if (
        Number(profile.score || 0) <
        Math.max(toNumber(config.warmingEmptyOddsCommitMinWaterScore, 48) - specialWaterRelax, 1)
      ) {
        return false;
      }
      if (
        Number(profile.highOddRate || 0) <
        clamp(
          toNumber(config.warmingEmptyOddsCommitMinHighOddRate, 0.56) - specialHighOddRelax,
          0.1,
          1
        )
      ) {
        return false;
      }
      if (
        Number(profile.highMechanismRate || 0) <
        clamp(
          toNumber(config.warmingEmptyOddsCommitMinHighMechanismRate, 0.05) - specialHighMechanismRelax,
          0,
          1
        )
      ) {
        return false;
      }
    } else {
      if (
        Number(info.score || 0) <
        minCandidateScore
      ) {
        return false;
      }
      if (
        Number(info.hitProbability || 0) <
        minHitProbability
      ) {
        return false;
      }
      if (
        Number(info.captureStats && info.captureStats.consecutiveSeenTicks || 0) <
        minStableSeenTicks
      ) {
        return false;
      }
      if (
        Number(profile.score || 0) <
        minWaterScore
      ) {
        return false;
      }
      if (
        Number(profile.highOddRate || 0) <
        minHighOddRate
      ) {
        return false;
      }
      if (
        Number(profile.highMechanismRate || 0) <
        minHighMechanismRate
      ) {
        return false;
      }
      if (
        usablePeerNetRatio <
        toNumber(config.warmingEmptyOddsMinPeerNetRatio, 0.08)
      ) {
        if (!strongHotWindowReady) {
          return false;
        }
      }
    }
    if (item.nativeCanAttackAvailable && !item.nativeCanAttack) {
      return false;
    }
    return true;
  }

  function getCandidateCaptureKey(candidate) {
    var sn = Number(candidate && candidate.sn || 0) || 0;
    if (sn > 0) {
      return "sn:" + String(sn);
    }
    var targetId = Number(candidate && candidate.tableEntityID || 0) || 0;
    if (targetId > 0) {
      return "id:" + String(targetId);
    }
    return "";
  }

  function updateCandidateCaptureState(candidates, state) {
    var capture = state.capture;
    capture.tickIndex = Number(capture.tickIndex || 0) + 1;
    var tickIndex = capture.tickIndex;
    var samples = capture.samples || {};
    var list = Array.isArray(candidates) ? candidates : [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var key = getCandidateCaptureKey(item);
      if (!key) {
        continue;
      }
      var targetId = Number(item.tableEntityID || item.symbolID || 0) || 0;
      var previous = samples[key] || null;
      var consecutiveSeenTicks =
        previous && Number(previous.lastSeenTick || 0) === tickIndex - 1
          ? Number(previous.consecutiveSeenTicks || 0) + 1
          : 1;
      var attackableSeenTicks =
        previous && Number(previous.lastSeenTick || 0) === tickIndex - 1
          ? item.nativeCanAttack
            ? Number(previous.attackableSeenTicks || 0) + 1
            : 0
          : item.nativeCanAttack
            ? 1
            : 0;
      samples[key] = {
        key: key,
        sn: Number(item.sn || 0) || 0,
        targetId: targetId,
        lastSeenTick: tickIndex,
        consecutiveSeenTicks: consecutiveSeenTicks,
        attackableSeenTicks: attackableSeenTicks,
        maxOddsMax: Math.max(
          Number(item.oddsMax || 0) || 0,
          Number(previous && previous.maxOddsMax || 0) || 0
        ),
        minDistanceScore:
          previous && isFinite(Number(previous.minDistanceScore))
            ? Math.min(
                Number(previous.minDistanceScore || 0) || 0,
                Number(item.distanceScore || 0) || 0
              )
            : Number(item.distanceScore || 0) || 0,
      };
    }
    for (var sampleKey in samples) {
      if (!hasOwn(samples, sampleKey)) {
        continue;
      }
      if (tickIndex - Number(samples[sampleKey].lastSeenTick || 0) > 3) {
        delete samples[sampleKey];
      }
    }
    capture.samples = samples;
    capture.lastUpdatedAt = Date.now();
    return capture;
  }

  function getCandidateCaptureStats(candidate, state) {
    var capture = state && state.capture ? state.capture : {};
    var samples = capture.samples || {};
    var key = getCandidateCaptureKey(candidate);
    var sample = key && samples[key] ? samples[key] : null;
    return {
      key: key,
      consecutiveSeenTicks: Number(sample && sample.consecutiveSeenTicks || 0) || 0,
      attackableSeenTicks: Number(sample && sample.attackableSeenTicks || 0) || 0,
      maxOddsMax: Number(sample && sample.maxOddsMax || 0) || 0,
      minDistanceScore: Number(sample && sample.minDistanceScore || 0) || 0,
    };
  }

  function estimateCandidateHitProbability(candidate, scoreInfo) {
    var distancePart = clamp(Number(candidate.distanceOpenFireScore || 0) || 0, 0, 40);
    var stabilityPart = clamp(Number(scoreInfo.stabilityScore || 0) || 0, 0, 24);
    var attackablePart = clamp(Number(scoreInfo.attackableHistoryScore || 0) || 0, 0, 18);
    var precisionPart = clamp(Number(scoreInfo.precisionBonus || 0) || 0, -20, 25);
    var total = Math.round(clamp(28 + distancePart + stabilityPart + attackablePart + precisionPart, 1, 98));
    return total;
  }

  function buildCandidateScore(candidate, config, state) {
    var targetId = Number(candidate.tableEntityID || candidate.symbolID || 0) || 0;
    var tier = getPrecisionTargetTier(config, targetId);
    var blockedCandidate = isCandidatePrecisionBlacklisted(config, candidate);
    var roomTemporaryBlocked = isRoomTemporaryBlockedTarget(state, targetId);
    var specialEventCandidate = isSpecialEventCandidate(config, candidate);
    if (blockedCandidate) {
      tier = "blacklist";
    }
    var precisionBonus = getPrecisionTierBonus(tier);
    var captureStats = getCandidateCaptureStats(candidate, state);
    var preferredTargetBonus = "primary" === tier ? 25 : "secondary" === tier ? 10 : 0;
    var observationTargetBonusInfo = getObservationTargetBonus(config, targetId);
    var observationHourBonusInfo = getObservationHourBonus(config, Date.now());
    var observationTargetBonus = blockedCandidate
      ? 0
      : Number(observationTargetBonusInfo.scoreBonus || 0) || 0;
    var observationHourBonus = blockedCandidate
      ? 0
      : Number(observationHourBonusInfo.scoreBonus || 0) || 0;
    var specialTargetBonus = specialEventCandidate
      ? Math.max(toNumber(config && config.specialEventScoreBonus, 12), 0)
      : 0;
    var oddsScore = clamp(candidate.oddsMax * 2, 0, 80);
    var distanceScore = clamp(candidate.distanceOpenFireScore, 0, 40);
    var attackableScore = candidate.nativeCanAttackAvailable
      ? candidate.nativeCanAttack
        ? 12
        : -60
      : 6;
    var touchScore = candidate.canTouch ? 8 : -100;
    var stabilityScore = clamp(
      Math.max(Number(captureStats.consecutiveSeenTicks || 0) - 1, 0) * 12,
      0,
      36
    );
    var attackableHistoryScore = clamp(
      Number(captureStats.attackableSeenTicks || 0) * 6,
      0,
      18
    );
    var oddsEmptyPenalty = 0;
    if (!(Number(candidate.oddsMax || 0) > 0)) {
      if (false !== config.dynamicTargeting) {
        oddsEmptyPenalty = -18;
      } else if (
        config.strictWhitelistWhenOddsEmpty &&
        "primary" !== tier &&
        "secondary" !== tier
      ) {
        oddsEmptyPenalty = -45;
      }
    }
    var score = Math.round(
      oddsScore +
        distanceScore +
        attackableScore +
        touchScore +
        preferredTargetBonus +
        precisionBonus +
        observationTargetBonus +
        observationHourBonus +
        specialTargetBonus +
        stabilityScore +
        attackableHistoryScore +
        oddsEmptyPenalty
    );
    if (blockedCandidate) {
      score = -999;
    } else if (roomTemporaryBlocked) {
      score -= 140;
    }
    var hitProbability = clamp(estimateCandidateHitProbability(candidate, {
      stabilityScore: stabilityScore,
      attackableHistoryScore: attackableHistoryScore,
      precisionBonus: precisionBonus,
    }) + (specialEventCandidate
      ? Math.max(toNumber(config && config.specialEventHitProbabilityBonus, 3), 0)
      : 0), 1, 98);
    if (blockedCandidate) {
      hitProbability = 0;
    } else if (roomTemporaryBlocked) {
      hitProbability = Math.min(hitProbability, 1);
    }
    return {
      score: score,
      preferredTarget: preferredTargetBonus > 0,
      preferredTargetBonus: preferredTargetBonus,
      tier: tier,
      precisionBonus: precisionBonus,
      observationTargetBonus: observationTargetBonus,
      observationTargetTier: String(observationTargetBonusInfo.tier || ""),
      observationHourBonus: observationHourBonus,
      observationHourTier: String(observationHourBonusInfo.tier || ""),
      observationHourSlot: String(observationHourBonusInfo.slot || ""),
      oddsScore: oddsScore,
      distanceScore: distanceScore,
      attackableScore: attackableScore,
      touchScore: touchScore,
      specialEventCandidate: specialEventCandidate,
      specialTargetBonus: specialTargetBonus,
      stabilityScore: stabilityScore,
      attackableHistoryScore: attackableHistoryScore,
      captureStats: captureStats,
      oddsEmptyPenalty: oddsEmptyPenalty,
      blockedCandidate: blockedCandidate,
      roomTemporaryBlocked: roomTemporaryBlocked,
      hitProbability: hitProbability,
      allowEmptyOddsProbe: allowProbeForEmptyOddsCandidate(candidate, {
        tier: tier,
        captureStats: captureStats,
        hitProbability: hitProbability,
      }, config),
    };
  }

  function isCandidateReadyForCombat(candidate, config) {
    var item = pickObject(candidate);
    var scoreInfo = pickObject(item.scoreInfo);
    var stableSeenTicks = Number(
      scoreInfo.captureStats && scoreInfo.captureStats.consecutiveSeenTicks || 0
    ) || 0;
    return !!(
      item &&
      item.node &&
      !scoreInfo.roomTemporaryBlocked &&
      Number(item.score || 0) >= Number(config.minCandidateScore || 0) &&
      Number(item.hitProbability || 0) >= Number(config.minHitProbability || 0) &&
      stableSeenTicks >= Math.max(toInt(config.minStableSeenTicks, 1), 1) &&
      (!item.nativeCanAttackAvailable || item.nativeCanAttack)
    );
  }

  function isProfitCombatCandidate(candidate) {
    var item = pickObject(candidate);
    var scoreInfo = pickObject(item.scoreInfo);
    var tier = String(scoreInfo.tier || "");
    if (!item || !item.node) {
      return false;
    }
    if (scoreInfo.roomTemporaryBlocked) {
      return false;
    }
    if ("blacklist" === tier || "invalid" === tier) {
      return false;
    }
    if (isWhitelistPrecisionTier(tier)) {
      return true;
    }
    if (scoreInfo.specialEventCandidate) {
      return true;
    }
    if (isCandidateProfitOddsBlocked(runtimeState && runtimeState.config, item)) {
      return false;
    }
    return false;
  }

  function pickProfitCombatCandidate(analyzed) {
    var list = Array.isArray(analyzed) ? analyzed : [];
    for (var i = 0; i < list.length; i++) {
      if (isProfitCombatCandidate(list[i])) {
        return list[i];
      }
    }
    return null;
  }

  function analyzeCurrentRoom(config, state) {
    var candidates = getCurrentScreenFishCandidates();
    updateCandidateCaptureState(candidates, state);
    var analyzed = [];
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      var scoreInfo = buildCandidateScore(candidate, config, state);
      candidate.score = scoreInfo.score;
      candidate.scoreInfo = scoreInfo;
      candidate.hitProbability = Number(scoreInfo.hitProbability || 0) || 0;
      analyzed.push(candidate);
    }
    analyzed.sort(function (a, b) {
      if (Number(b.score || 0) !== Number(a.score || 0)) {
        return Number(b.score || 0) - Number(a.score || 0);
      }
      if (Number(b.oddsMax || 0) !== Number(a.oddsMax || 0)) {
        return Number(b.oddsMax || 0) - Number(a.oddsMax || 0);
      }
      return Number(a.distanceScore || 0) - Number(b.distanceScore || 0);
    });
    var attackableCount = analyzed.filter(function (item) {
      return !item.nativeCanAttackAvailable || item.nativeCanAttack;
    }).length;
    var bestCandidate = analyzed.length ? analyzed[0] : null;
    var profitCandidate = pickProfitCombatCandidate(analyzed);
    var bestScore = Number(bestCandidate && bestCandidate.score || 0) || 0;
    var bestOddsMax = Number(bestCandidate && bestCandidate.oddsMax || 0) || 0;
    var bestHitProbability = Number(bestCandidate && bestCandidate.hitProbability || 0) || 0;
    var profitScore = Number(profitCandidate && profitCandidate.score || 0) || 0;
    var profitOddsMax = Number(profitCandidate && profitCandidate.oddsMax || 0) || 0;
    var profitHitProbability =
      Number(profitCandidate && profitCandidate.hitProbability || 0) || 0;
    var highConfirmed =
      !!profitCandidate &&
      (profitOddsMax >= Number(config.highOddsThreshold || 0) ||
        profitScore >= Number(config.highScoreThreshold || 0));
    var mediumConfirmed =
      !!profitCandidate &&
      !highConfirmed &&
      (profitOddsMax >= Number(config.mediumOddsThreshold || 0) ||
        profitScore >= Number(config.mediumScoreThreshold || 0));
    var candidateReady = isCandidateReadyForCombat(bestCandidate, config);
    var profitCandidateReady = isCandidateReadyForCombat(profitCandidate, config);
    return {
      candidateCount: analyzed.length,
      attackableCount: attackableCount,
      bestCandidate: bestCandidate,
      profitCandidate: profitCandidate,
      bestScore: bestScore,
      bestOddsMax: bestOddsMax,
      bestHitProbability: bestHitProbability,
      profitScore: profitScore,
      profitOddsMax: profitOddsMax,
      profitHitProbability: profitHitProbability,
      highConfirmed: highConfirmed,
      mediumConfirmed: mediumConfirmed,
      candidateReady: candidateReady,
      profitCandidateReady: profitCandidateReady,
      topCandidates: analyzed.slice(0, 5).map(function (item) {
        return {
          sn: item.sn,
          tableEntityID: item.tableEntityID,
          symbolID: item.symbolID,
          fishKind: Number(item.fishKind || 0) || 0,
          name: item.name,
          score: item.score,
          oddsMax: item.oddsMax,
          hitProbability: item.hitProbability,
          distanceOpenFireScore: item.distanceOpenFireScore,
          nativeCanAttack: item.nativeCanAttack,
          preferredTarget: !!(item.scoreInfo && item.scoreInfo.preferredTarget),
          tier: item.scoreInfo ? item.scoreInfo.tier : "",
          allowEmptyOddsProbe:
            !!(item.scoreInfo && item.scoreInfo.allowEmptyOddsProbe),
          specialEventCandidate:
            !!(item.scoreInfo && item.scoreInfo.specialEventCandidate),
          stableSeenTicks:
            item.scoreInfo && item.scoreInfo.captureStats
              ? Number(item.scoreInfo.captureStats.consecutiveSeenTicks || 0) || 0
              : 0,
        };
      }),
    };
  }

  function resolveAimAttackModeId() {
    if (
      "undefined" != typeof AttackModeTableEnum &&
      void 0 !== AttackModeTableEnum.OneFireByClickBG
    ) {
      return Number(AttackModeTableEnum.OneFireByClickBG) || 1;
    }
    return 1;
  }

  function pickPostHitFollowupCandidate(analysis, state, config) {
    var outcome = pickObject(state && state.lastResolvedFireOutcome);
    if ("hit" !== String(outcome.outcome || "")) {
      return null;
    }
    if (
      true === !!(config && config.postHitFollowupRequireBoundHit) &&
      !!outcome.targetBindingMismatch
    ) {
      return null;
    }
    var targetSN = Number(outcome.resolvedTargetSN || outcome.targetSN || 0) || 0;
    var targetId = Number(outcome.resolvedTargetId || outcome.targetId || 0) || 0;
    var topCandidates = Array.isArray(analysis && analysis.topCandidates)
      ? analysis.topCandidates
      : [];
    for (var i = 0; i < topCandidates.length; i++) {
      var item = topCandidates[i];
      if (!item) {
        continue;
      }
      var itemSN = Number(item.sn || 0) || 0;
      var itemTargetId = Number(item.tableEntityID || item.symbolID || 0) || 0;
      if (targetSN > 0 && itemSN > 0 && targetSN === itemSN) {
        return item;
      }
      if (!(targetSN > 0) && targetId > 0 && itemTargetId > 0 && targetId === itemTargetId) {
        return item;
      }
    }
    return null;
  }

  function ensureAimMode(state, config) {
    try {
      if (
        "undefined" == typeof AttackModeProxy ||
        "undefined" == typeof AttackModeEvent
      ) {
        return false;
      }
      var attackProxy = getAttackModeProxyInstance();
      if (!attackProxy) {
        return false;
      }
      var currentMode = refreshObservedAttackModeState(state, attackProxy);
      var targetMode = resolveAimAttackModeId();
      if (
        attackProxy.strategy &&
        attackProxy.strategy.tableEntity &&
        attackProxy.strategy.tableEntity.isTargetSymbol &&
        currentMode === targetMode
      ) {
        if (state.aimReadyAt && Date.now() >= state.aimReadyAt) {
          state.aimReadyAt = 0;
        }
        return true;
      }
      if (currentMode !== targetMode) {
        "function" == typeof attackProxy.enableShootTimer &&
          attackProxy.enableShootTimer(false);
        "function" == typeof attackProxy.cleanLockedTarget &&
          attackProxy.cleanLockedTarget();
        if (
          attackProxy.strategy &&
          "function" == typeof attackProxy.strategy.disable &&
          isContinuousAttackModeId(currentMode)
        ) {
          attackProxy.strategy.disable();
        }
        var facade = getFacade();
        if (!facade || "function" != typeof facade.sendNotification) {
          return false;
        }
        facade.sendNotification(AttackModeEvent.MODIFY_ATTACK_MODE_TYPE, targetMode);
        state.lastAimSwitchAt = Date.now();
        state.aimReadyAt = state.lastAimSwitchAt + Math.max(toInt(config.aimModeWarmupMs, 1200), 0);
        return false;
      }
      if (state.aimReadyAt && Date.now() < state.aimReadyAt) {
        return false;
      }
      state.aimReadyAt = 0;
      refreshObservedAttackModeState(state, attackProxy);
      return true;
    } catch (err) {
      return false;
    }
  }

  function clearAttackTarget() {
    var attackProxy = getAttackModeProxyInstance();
    if (!attackProxy) {
      return false;
    }
    if (attackProxy.strategy) {
      attackProxy.strategy.target = void 0;
    }
    "function" == typeof attackProxy.cleanLockedTarget &&
      attackProxy.cleanLockedTarget();
    "function" == typeof attackProxy.enableShootTimer &&
      attackProxy.enableShootTimer(false);
    return true;
  }

  function unlockFish() {
    try {
      return clearAttackTarget();
    } catch (err) {
      return false;
    }
  }

  function tryRecoverNativeFireBlocked(state, config, attackProxy, nativeBlockDetail) {
    if (!state || !attackProxy) {
      return null;
    }
    var now = Date.now();
    if (
      now - (Number(state.lastNativeRecoveryAt || 0) || 0) <
      Math.max(toInt(config && config.nativeBlockedRecoveryCooldownMs, 900), 300)
    ) {
      return null;
    }
    var blockedCount = Math.max(Number(state.blockedReasonCount || 0) || 0, 0);
    var detail = pickObject(nativeBlockDetail);
    var desiredModeId = resolveAimAttackModeId();
    var currentModeId = refreshObservedAttackModeState(state, attackProxy);
    var modeUnexpected = isUnexpectedNativeAttackModeId(currentModeId, desiredModeId);
    var recentUnexpectedMode = shouldTreatNativeContinuousFireAsActive(state, config);
    var shouldSoftRecover =
      blockedCount >= Math.max(toInt(config && config.nativeBlockedSoftRecoverThreshold, 1), 1) ||
      modeUnexpected ||
      recentUnexpectedMode ||
      "no_bullet" === String(detail.code || "");
    var shouldHardReset =
      blockedCount >= Math.max(toInt(config && config.nativeBlockedResetThreshold, 6), 2) &&
      ("no_bullet" === String(detail.code || "") ||
        "unknown" === String(detail.code || "") ||
        "bullet_queue_full" === String(detail.code || ""));
    if (!shouldSoftRecover && !shouldHardReset) {
      return null;
    }
    var actions = [];
    try {
      if (attackProxy.strategy && "function" == typeof attackProxy.strategy.disable) {
        attackProxy.strategy.disable();
        actions.push("strategy_disable");
      }
    } catch (err) {}
    if (clearAttackTarget()) {
      actions.push("clear_attack_target");
    }
    try {
      if ("function" == typeof attackProxy.cleanLockedTarget) {
        attackProxy.cleanLockedTarget();
        actions.push("clean_locked_target");
      }
    } catch (err) {}
    try {
      if ("function" == typeof attackProxy.enableShootTimer) {
        attackProxy.enableShootTimer(false);
        actions.push("disable_shoot_timer");
      }
    } catch (err) {}
    if (modeUnexpected || recentUnexpectedMode) {
      try {
        if ("function" == typeof attackProxy.changeAttackMode) {
          attackProxy.changeAttackMode(desiredModeId);
          actions.push("change_attack_mode");
        } else {
          ensureAimMode(state, config);
          actions.push("ensure_aim_mode");
        }
        state.lastAimSwitchAt = now;
        state.aimReadyAt =
          now + Math.max(toInt(config && config.aimModeWarmupMs, 500), 0);
      } catch (err) {}
    }
    if (shouldHardReset) {
      try {
        if ("function" == typeof attackProxy.reset) {
          attackProxy.reset();
          actions.push("attack_proxy_reset");
        }
      } catch (err) {}
      try {
        if ("function" == typeof attackProxy.changeAttackMode) {
          attackProxy.changeAttackMode(desiredModeId);
          actions.push("reset_to_desired_mode");
        }
      } catch (err) {}
    }
    if ("no_bullet" === String(detail.code || "") && !shouldHardReset) {
      try {
        if ("function" == typeof attackProxy.changeAttackMode) {
          attackProxy.changeAttackMode(desiredModeId);
          actions.push("force_change_attack_mode");
        }
      } catch (err) {}
      try {
        if ("function" == typeof attackProxy.reset) {
          attackProxy.reset();
          actions.push("force_attack_proxy_reset");
        }
      } catch (err) {}
    }
    if (!actions.length) {
      return null;
    }
    state.lastNativeRecoveryAt = now;
    state.nativeFireRecoveryCount = (Number(state.nativeFireRecoveryCount || 0) || 0) + 1;
    var payload = {
      source: "native_fire_blocked_recovery",
      blockedCount: blockedCount,
      blockCode: String(detail.code || ""),
      currentAttackModeId: currentModeId,
      currentAttackModeLabel: getAttackModeLabel(currentModeId),
      desiredModeId: desiredModeId,
      desiredModeLabel: getAttackModeLabel(desiredModeId),
      recentObservedModeId: Number(state.lastObservedSelfFireModeId || 0) || 0,
      recentObservedModeLabel: getAttackModeLabel(state.lastObservedSelfFireModeId),
      remainBulletCount: Number(detail.remainBulletCount || 0) || 0,
      selfBulletSize: Number(detail.selfBulletSize || 0) || 0,
      actions: actions.slice(),
    };
    recordFireAudit(state, "native_fire_blocked_recovery", payload);
    return payload;
  }

  function findFreshCandidateForFire(candidate) {
    var currentCandidates = getCurrentScreenFishCandidates();
    var targetSN = Number(candidate && candidate.sn || 0) || 0;
    var targetId = Number(candidate && candidate.tableEntityID || 0) || 0;
    for (var i = 0; i < currentCandidates.length; i++) {
      var item = currentCandidates[i];
      if (targetSN > 0 && (Number(item.sn || 0) || 0) === targetSN) {
        return item;
      }
      if (
        !(targetSN > 0) &&
        targetId > 0 &&
        (Number(item.tableEntityID || 0) || 0) === targetId
      ) {
        return item;
      }
    }
    return null;
  }

  function buildFireTargetSnapshot(candidate) {
    if (!candidate) {
      return {
        sn: 0,
        tableEntityID: 0,
        symbolID: 0,
        fishKind: 0,
        name: "",
        specialEventCandidate: false,
      };
    }
    return {
      sn: Number(candidate.sn || 0) || 0,
      tableEntityID: Number(candidate.tableEntityID || 0) || 0,
      symbolID: Number(candidate.symbolID || 0) || 0,
      fishKind: Number(candidate.fishKind || 0) || 0,
      name: String(candidate.name || ""),
      specialEventCandidate: !!candidate.specialEventCandidate,
    };
  }

  function buildFirePendingMeta(candidate, state, scoreInfo, extra) {
    var meta = extra && "object" == typeof extra ? extra : {};
    var captureStats = pickObject(scoreInfo && scoreInfo.captureStats);
    var mechanismSummary = buildSelfMechanismSummary(state);
    return {
      fireMode: String(meta.fireMode || ""),
      fireMethod: String(meta.fireMethod || ""),
      betRaw:
        Number(
          void 0 !== meta.betRaw
            ? meta.betRaw
            : getSelfBetRuntime().currentBetCent || 0
        ) || 0,
      hitProbability:
        Number(
          void 0 !== meta.hitProbability
            ? meta.hitProbability
            : scoreInfo && scoreInfo.hitProbability || 0
        ) || 0,
      candidateScore:
        Number(
          void 0 !== meta.candidateScore
            ? meta.candidateScore
            : scoreInfo && scoreInfo.score || 0
        ) || 0,
      tier: String(meta.tier || scoreInfo && scoreInfo.tier || ""),
      stableSeenTicks:
        Number(
          void 0 !== meta.stableSeenTicks
            ? meta.stableSeenTicks
            : captureStats.consecutiveSeenTicks || 0
        ) || 0,
      oddsMax:
        Number(
          void 0 !== meta.oddsMax
            ? meta.oddsMax
            : candidate && candidate.oddsMax || 0
        ) || 0,
      allowEmptyOddsProbe: !!meta.allowEmptyOddsProbe,
      mechanismHintType: String(
        meta.mechanismHintType || mechanismSummary.mechanismType || ""
      ),
      mechanismHintLabel: String(
        meta.mechanismHintLabel || mechanismSummary.label || ""
      ),
      roomProfitRaw:
        Number(
          void 0 !== meta.roomProfitRaw
            ? meta.roomProfitRaw
            : state && state.roomProfitRaw || 0
        ) || 0,
    };
  }

  var fireController = {
    prepare: function (candidate, state, config, options) {
      var opts = options && "object" == typeof options ? options : {};
      var requireCandidate = false !== opts.requireCandidate;
      if (requireCandidate && (!candidate || !candidate.node)) {
        return {
          ok: false,
          fired: false,
          reason: "candidate_missing",
        };
      }
      if (false !== opts.checkRoomSettling && isRoomNativeSettling(state, config)) {
        unlockFish();
        return {
          ok: false,
          fired: false,
          reason: "room_native_settling",
          waitMs: Math.max((Number(state && state.roomNativeStableAt || 0) || 0) - Date.now(), 0),
        };
      }
      var attackProxy = getAttackModeProxyInstance();
      if (
        !attackProxy ||
        !attackProxy.strategy ||
        "function" != typeof attackProxy.shootByManual
      ) {
        return {
          ok: false,
          fired: false,
          reason: "attack_proxy_unavailable",
        };
      }
      var freshCandidate = candidate;
      if ((requireCandidate || candidate) && opts.recheckBeforeFire) {
        freshCandidate = findFreshCandidateForFire(candidate);
      }
      if (requireCandidate && (!freshCandidate || !freshCandidate.node)) {
        unlockFish();
        return {
          ok: false,
          fired: false,
          reason: "target_lost_before_fire",
        };
      }
      return {
        ok: true,
        attackProxy: attackProxy,
        candidate: freshCandidate || null,
        now: Date.now(),
      };
    },
    validateRuntime: function (context, state, config, options) {
      var opts = options && "object" == typeof options ? options : {};
      var attackProxy = context && context.attackProxy;
      var now = Number(context && context.now || Date.now()) || Date.now();
      if (now - state.lastFireAt < Math.max(toInt(config.manualFireCooldownMs, 450), 100)) {
        return {
          ok: false,
          fired: false,
          reason: "manual_fire_cooldown",
          waitMs:
            Math.max(toInt(config.manualFireCooldownMs, 450), 100) - (now - state.lastFireAt),
        };
      }
      if (
        "function" == typeof attackProxy.checkSelfMoney &&
        !attackProxy.checkSelfMoney()
      ) {
        return {
          ok: false,
          fired: false,
          reason: "insufficient_balance",
        };
      }
      if (
        "function" == typeof attackProxy.checkSelfCanFire &&
        !attackProxy.checkSelfCanFire()
      ) {
        refreshObservedAttackModeState(state, attackProxy);
        var nativeBlockDetail = getNativeFireBlockDetail(attackProxy);
        var nativeRecoveryPayload = null;
        state.lastNativeFireBlockDetail = cloneObject(nativeBlockDetail);
        state.nativeFireBlockedCount =
          (Number(state.nativeFireBlockedCount || 0) || 0) + 1;
        false !== opts.unlockOnNativeBlocked && unlockFish();
        nativeRecoveryPayload = tryRecoverNativeFireBlocked(
          state,
          config,
          attackProxy,
          nativeBlockDetail
        );
        recordFireAudit(state, "native_fire_blocked", {
          source: "validate_runtime",
          blockCode: String(nativeBlockDetail.code || ""),
          blockLabel: String(nativeBlockDetail.label || ""),
          remainBulletCount: Number(nativeBlockDetail.remainBulletCount || 0) || 0,
          selfBulletSize: Number(nativeBlockDetail.selfBulletSize || 0) || 0,
          bulletType: Number(nativeBlockDetail.bulletType || 0) || 0,
          blockedCount: Number(state.nativeFireBlockedCount || 0) || 0,
          currentAttackModeId: Number(state.currentAttackModeId || 0) || 0,
          currentAttackModeLabel: String(state.currentAttackModeLabel || ""),
          recoveryActions:
            nativeRecoveryPayload && Array.isArray(nativeRecoveryPayload.actions)
              ? nativeRecoveryPayload.actions.slice()
              : [],
        });
        if (shouldTreatNativeContinuousFireAsActive(state, config)) {
          var activeModePayload = buildActiveNativeContinuousFireAuditPayload(
            state,
            attackProxy
          );
          var activeModeAuditType = getNativeAttackModeAuditType(
            activeModePayload.fireModeId,
            activeModePayload.desiredModeId
          );
          recordFireAudit(
            state,
            activeModeAuditType || "native_attack_mode_drift",
            activeModePayload
          );
          return {
            ok: false,
            fired: false,
            reason: activeModeAuditType || "native_attack_mode_drift",
            nativeRecoveryPayload: cloneObject(nativeRecoveryPayload),
          };
        }
        var noBulletImmediateLeaveEligible = !!(
          "no_bullet" === String(nativeBlockDetail.code || "") &&
          !state.pendingLeavePlan &&
          (Number(state.nativeFireBlockedCount || 0) || 0) >=
            Math.max(toInt(config && config.blockedNoBulletLeaveThreshold, 2), 1) &&
          Date.now() - Math.max(
            Number(state.lastFireAt || 0) || 0,
            Number(state.roomEnteredAt || 0) || 0
          ) >= Math.min(toInt(config && config.blockedNoBulletMinStayMs, 2500), 1500)
        );
        if (noBulletImmediateLeaveEligible) {
          var immediateLeaveDecision = requestLeaveRoomWithPlan(
            "blocked_dead_room_leave_room",
            {
              roomStatus: getRoomStatus(config && config.preferredRooms),
              roomProfitRaw: Number(state.roomProfitRaw || 0) || 0,
              roomPeakProfitRaw: Number(state.roomPeakProfitRaw || 0) || 0,
              roomResolvedShotCount: Number(state.roomResolvedShotCount || 0) || 0,
              roomResolvedHitCount: Number(state.roomResolvedHitCount || 0) || 0,
              blockedReason: "native_fire_blocked",
              blockedCount: Number(state.blockedReasonCount || 0) || 0,
              nativeFireBlockedCount: Number(state.nativeFireBlockedCount || 0) || 0,
            }
          );
          return {
            ok: false,
            fired: false,
            reason: "blocked_dead_room_leave_room",
            nativeBlockDetail: cloneObject(nativeBlockDetail),
            nativeRecoveryPayload: cloneObject(nativeRecoveryPayload),
            immediateLeaveDecision: immediateLeaveDecision,
          };
        }
        return {
          ok: false,
          fired: false,
          reason: "native_fire_blocked",
          nativeBlockDetail: cloneObject(nativeBlockDetail),
          nativeRecoveryPayload: cloneObject(nativeRecoveryPayload),
        };
      }
      return null;
    },
    execute: function (context, options) {
      var opts = options && "object" == typeof options ? options : {};
      var attackProxy = context.attackProxy;
      var candidate = context.candidate;
      "function" == typeof attackProxy.enableShootTimer &&
        attackProxy.enableShootTimer(false);
      "function" == typeof attackProxy.cleanLockedTarget &&
        attackProxy.cleanLockedTarget();
      if (attackProxy.strategy) {
        attackProxy.strategy.target = candidate && candidate.node ? candidate.node : void 0;
      }
      if (candidate && false !== opts.lockTarget) {
        "function" == typeof attackProxy.setLockedTarget &&
          attackProxy.setLockedTarget(
            Number(candidate.tableEntityID || candidate.symbolID || 0) || 0,
            Number(candidate.sn || 0) || 0
          );
      } else if (
        !candidate &&
        opts.cleanLockedWhenNoCandidate &&
        "function" == typeof attackProxy.cleanLockedTarget
      ) {
        attackProxy.cleanLockedTarget();
      }
      attackProxy.shootByManual();
      return {
        fireMethod: candidate
          ? "locked_manual_single_fire"
          : "manual_keepalive_fire",
      };
    },
    commit: function (context, state, options) {
      var opts = options && "object" == typeof options ? options : {};
      var candidate = context && context.candidate;
      state.lastFireAt = Number(context && context.now || Date.now()) || Date.now();
      if (opts.resetIdleKeepaliveDueAt) {
        state.roomIdleKeepaliveDueAt = 0;
      }
      state.lastTarget = buildFireTargetSnapshot(candidate);
      if (!candidate || !opts.pendingMeta) {
        return null;
      }
      return registerPendingFireOutcome(
        state,
        candidate,
        state.lastFireAt,
        buildFirePendingMeta(candidate, state, opts.scoreInfo, opts.pendingMeta)
      );
    },
  };

  fireController.fireCandidate = function (candidate, state, config, mode) {
    var fireContext = fireController.prepare(candidate, state, config, {
      requireCandidate: true,
      checkRoomSettling: true,
      recheckBeforeFire: !!config.recheckBeforeFire,
    });
    if (!fireContext.ok) {
      return fireContext;
    }
    var freshCandidate = fireContext.candidate;
    var freshScoreInfo = buildCandidateScore(freshCandidate, config, state);
    var modeName = String(mode || "");
    var probeMode = "probe" === modeName;
    var coldProbeMode = "cold_probe" === modeName;
    var bounds = readRoomBounds(getRoomStatus(config && config.preferredRooms).currentRoomSize, config);
    var fireSafeLimit = resolveFireSafeMaxPaolevel(
      freshCandidate,
      freshScoreInfo,
      state,
      bounds,
      modeName
    );
    var fireSafeDesiredPaolevel = Math.max(
      toInt(fireSafeLimit && fireSafeLimit.maxPaolevel, bounds.min),
      1
    );
    var currentFirePaolevel = Math.max(
      toInt(getSelfBetRuntime() && getSelfBetRuntime().currentPaolevel, bounds.min),
      1
    );
    if (currentFirePaolevel > fireSafeDesiredPaolevel) {
      var fireGuardBetResult = applyBetStep(
        getSelfBetRuntime(),
        fireSafeDesiredPaolevel,
        state,
        config
      );
      unlockFish();
      return {
        ok: false,
        fired: false,
        reason: fireGuardBetResult.changed
          ? "fire_safe_bet_syncing"
          : "fire_safe_bet_guarded",
        betResult: fireGuardBetResult,
        currentPaolevel: currentFirePaolevel,
        desiredPaolevel: fireSafeDesiredPaolevel,
      };
    }
    if (
      getActivePendingFireCount(state) >=
      Math.max(toInt(config && config.maxPendingFireOutcomes, 1), 0)
    ) {
      unlockFish();
      return {
        ok: false,
        fired: false,
        reason: "pending_fire_outcome_waiting",
      };
    }
    if (
      !(Number(freshCandidate.oddsMax || 0) > 0) &&
      "neutral" === String(freshScoreInfo.tier || "") &&
      (Number(state && state.roomResolvedHitCount || 0) || 0) <= 0 &&
      (
        (Number(state && state.consecutiveMissShots || 0) || 0) > 0 ||
        (
          (Number(state && state.roomResolvedShotCount || 0) || 0) > 0 &&
          (Number(state && state.roomProfitRaw || 0) || 0) < 0
        )
      )
    ) {
      unlockFish();
      return {
        ok: false,
        fired: false,
        reason: "empty_odds_after_miss_guard",
      };
    }
    if (!ensureAimMode(state, config)) {
      var profile = pickObject(state && state.platformWaterProfile);
      var level = String(profile.level || "");
      var waterActionGuard = buildPlatformWaterActionGuard(state, config);
      if (
        probeMode &&
        waterActionGuard.directFireReady &&
        ("warming" === level || "open_suspected" === level) &&
        !(Number(freshCandidate.oddsMax || 0) > 0) &&
        !isWhitelistPrecisionTier(String(freshScoreInfo.tier || "")) &&
        "neutral" === String(freshScoreInfo.tier || "") &&
        Math.max(toInt(state && state.roomWarmingEmptyOddsFireCount, 0), 0) <
          Math.max(toInt(config.warmingEmptyOddsMaxShotsPerRoom, 1), 0) &&
        Number(freshScoreInfo.score || 0) >=
          Math.max(toNumber(config.warmingEmptyOddsCommitMinCandidateScore, 91), 1) &&
        Number(freshScoreInfo.hitProbability || 0) >=
          Math.max(toNumber(config.warmingEmptyOddsCommitMinHitProbability, 98), 1) &&
        Number(
          freshScoreInfo.captureStats && freshScoreInfo.captureStats.consecutiveSeenTicks || 0
        ) >= Math.max(toInt(config.warmingEmptyOddsCommitMinStableSeenTicks, 6), 1) &&
        Number(profile.score || 0) >=
          Math.max(toNumber(config.warmingEmptyOddsCommitMinWaterScore, 48), 1) &&
        Number(profile.highOddRate || 0) >=
          clamp(toNumber(config.warmingEmptyOddsCommitMinHighOddRate, 0.56), 0.1, 1) &&
        Number(profile.highMechanismRate || 0) >=
          clamp(toNumber(config.warmingEmptyOddsCommitMinHighMechanismRate, 0.05), 0, 1)
      ) {
        state.warmingEmptyOddsCommitUntil =
          Date.now() + Math.max(toInt(config.warmingEmptyOddsCommitWindowMs, 3500), 0);
      }
      return {
        ok: false,
        fired: false,
        reason: state.aimReadyAt ? "aim_mode_warming" : "aim_mode_unavailable",
        waitMs: state.aimReadyAt ? Math.max(state.aimReadyAt - Date.now(), 0) : 0,
      };
    }
    if (
      Number(freshScoreInfo.captureStats && freshScoreInfo.captureStats.consecutiveSeenTicks || 0) <
      Math.max(toInt(config.minStableSeenTicks, 1), 1)
    ) {
      return {
        ok: false,
        fired: false,
        reason: "target_not_stable_enough",
      };
    }
    if (Number(freshScoreInfo.hitProbability || 0) < Number(config.minHitProbability || 0)) {
      return {
        ok: false,
        fired: false,
        reason: "hit_probability_too_low",
        hitProbability: Number(freshScoreInfo.hitProbability || 0) || 0,
      };
    }
    var warmingEmptyOddsPrecisionReady = canAllowWarmingEmptyOddsPrecision(
      freshCandidate,
      freshScoreInfo,
      state,
      config
    );
    var warmingNeutralProbeReady = canAllowWarmingNeutralProbe(
      freshCandidate,
      freshScoreInfo,
      state,
      config
    );
    var emptyOddsWhitelistBypass = shouldBypassEmptyOddsWhitelist(
      state && state.platformWaterProfile,
      freshCandidate,
      freshScoreInfo
    );
    if (
      config.strictWhitelistWhenOddsEmpty &&
      !(Number(freshCandidate.oddsMax || 0) > 0) &&
      !isWhitelistPrecisionTier(freshScoreInfo.tier) &&
      !emptyOddsWhitelistBypass &&
      !(probeMode && (freshScoreInfo.allowEmptyOddsProbe || warmingNeutralProbeReady)) &&
      !warmingEmptyOddsPrecisionReady &&
      !coldProbeMode
    ) {
      return {
        ok: false,
        fired: false,
        reason: "precision_non_whitelist_odds_empty",
      };
    }
    var runtimeGuard = fireController.validateRuntime(fireContext, state, config, {
      unlockOnNativeBlocked: true,
    });
    if (runtimeGuard) {
      return runtimeGuard;
    }
    var execution = fireController.execute(fireContext, {
      lockTarget: true,
    });
    if (warmingEmptyOddsPrecisionReady) {
      state.roomWarmingEmptyOddsFireCount =
        Math.max(toInt(state.roomWarmingEmptyOddsFireCount, 0), 0) + 1;
      state.warmingEmptyOddsCommitUntil = 0;
    }
    var pending = fireController.commit(fireContext, state, {
      scoreInfo: freshScoreInfo,
      pendingMeta: {
        fireMode: modeName,
        fireMethod: execution.fireMethod,
        allowEmptyOddsProbe: !!(freshScoreInfo.allowEmptyOddsProbe || warmingNeutralProbeReady),
      },
    });
    return {
      ok: true,
      fired: true,
      reason: "manual_fire",
      fireMethod: execution.fireMethod,
      shotId: Number(pending && pending.shotId || 0) || 0,
      target: cloneObject(state.lastTarget),
      hitProbability: Number(freshScoreInfo.hitProbability || 0) || 0,
      allowEmptyOddsProbe: !!(freshScoreInfo.allowEmptyOddsProbe || warmingNeutralProbeReady),
        warmingEmptyOddsPrecision: !!warmingEmptyOddsPrecisionReady,
      candidate: {
        name: String(freshCandidate.name || ""),
        tableEntityID: Number(freshCandidate.tableEntityID || 0) || 0,
        sn: Number(freshCandidate.sn || 0) || 0,
        symbolID: Number(freshCandidate.symbolID || 0) || 0,
        fishKind: Number(freshCandidate.fishKind || 0) || 0,
        tier: String(freshScoreInfo.tier || ""),
        specialEventCandidate: !!freshScoreInfo.specialEventCandidate,
        stableSeenTicks:
          Number(freshScoreInfo.captureStats && freshScoreInfo.captureStats.consecutiveSeenTicks || 0) || 0,
      },
    };
  };

  function fireCandidate(candidate, state, config, mode) {
    return fireController.fireCandidate(candidate, state, config, mode);
  }

  function normalizeBetChangeInput(input, countOverride) {
    var direction = "";
    var count = 0;
    if ("number" == typeof input) {
      var step = Number(input || 0);
      if (!step) {
        return null;
      }
      direction = step > 0 ? "add" : "subtract";
      count = Math.abs(Math.trunc(step));
    } else if ("string" == typeof input) {
      direction = String(input || "").trim().toLowerCase();
      count = Number(countOverride || 0) || 1;
    } else if (input && "object" == typeof input) {
      direction = String(input.direction || input.mode || "").trim().toLowerCase();
      count = Number(
        input.count || input.value || input.times || input.amount || countOverride || 0
      );
      if (!direction && void 0 !== input.step) {
        return normalizeBetChangeInput(Number(input.step || 0), countOverride);
      }
    }
    if ("plus" === direction || "increase" === direction || "加" === direction) {
      direction = "add";
    } else if (
      "minus" === direction ||
      "decrease" === direction ||
      "减" === direction
    ) {
      direction = "subtract";
    }
    count = Math.abs(Math.trunc(Number(count || 0)));
    if (!direction || count <= 0) {
      return null;
    }
    return {
      direction: direction,
      count: count,
    };
  }

  function changeBet(input, countOverride) {
    try {
      if (
        "undefined" == typeof SeatEvent ||
        "undefined" == typeof puremvc ||
        !puremvc.Facade
      ) {
        return false;
      }
      var facade = getFacade();
      if (!facade || "function" != typeof facade.sendNotification) {
        return false;
      }
      var config = normalizeBetChangeInput(input, countOverride);
      if (!config || !config.direction || config.count <= 0) {
        return false;
      }
      var eventName =
        "add" === config.direction
          ? SeatEvent.ON_SET_BET_ADD
          : "subtract" === config.direction
            ? SeatEvent.ON_SET_BET_SUBTRACT
            : "";
      if (!eventName) {
        return false;
      }
      for (var i = 0; i < config.count; i++) {
        facade.sendNotification(eventName);
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function readRoomBounds(roomSize, config) {
    var boundsConfig = pickObject(config.roomPaolevelConfig);
    var item = pickObject(boundsConfig[String(roomSize || "").trim().toLowerCase()]);
    var min = Math.max(toInt(item.min, toInt(config.defaultMinPaolevel, 1)), 1);
    var max = Math.max(toInt(item.max, toInt(config.defaultMaxPaolevel, min)), min);
    return {
      roomSize: String(roomSize || "unknown"),
      min: min,
      max: max,
      middle: max > min ? Math.max(min, Math.min(max, Math.round((min + max) / 2))) : min,
    };
  }

  function getBetCentForPaolevel(betRuntime, paolevel) {
    var index = Math.max(toInt(paolevel, 0) - 1, -1);
    if (!(index >= 0)) {
      return 0;
    }
    var betCentSteps = Array.isArray(betRuntime && betRuntime.betCentSteps)
      ? betRuntime.betCentSteps
      : [];
    return Number(betCentSteps[index] || 0) || 0;
  }

  function isActualBetAboveDesiredPaolevel(betRuntime, desiredPaolevel) {
    var currentPaolevel = Math.max(toInt(betRuntime && betRuntime.currentPaolevel, 0), 0);
    var desiredLevel = Math.max(toInt(desiredPaolevel, 0), 0);
    if (currentPaolevel > 0 && desiredLevel > 0) {
      return currentPaolevel > desiredLevel;
    }
    var currentBetCent = Number(betRuntime && betRuntime.currentBetCent || 0) || 0;
    var desiredBetCent = getBetCentForPaolevel(betRuntime, desiredLevel);
    if (!(currentBetCent > 0) || !(desiredBetCent > 0)) {
      return false;
    }
    return currentBetCent > desiredBetCent;
  }

  function getFinalPrimarySafePaolevel(bounds) {
    return clamp(2, Math.max(toInt(bounds && bounds.min, 1), 1), Math.max(toInt(bounds && bounds.max, 1), 1));
  }

  function resolveDesiredSafeMaxPaolevel(analysis, state, bounds, combatPolicy) {
    var profitCandidate = analysis && analysis.profitCandidate ? analysis.profitCandidate : null;
    var profitScoreInfo = profitCandidate && profitCandidate.scoreInfo ? profitCandidate.scoreInfo : null;
    var tier = String(profitScoreInfo && profitScoreInfo.tier || "");
    var roomResolvedHitCount = Math.max(toInt(state && state.roomResolvedHitCount, 0), 0);
    var roomProfitRaw = toNumber(state && state.roomProfitRaw, 0);
    var safeMaxPaolevel = Math.max(toInt(bounds && bounds.min, 1), 1);
    if (
      combatPolicy &&
      combatPolicy.allowCombat &&
      !combatPolicy.probeOnly &&
      "primary" === tier &&
      roomResolvedHitCount > 0 &&
      roomProfitRaw >= 0
    ) {
      safeMaxPaolevel = getFinalPrimarySafePaolevel(bounds);
    }
    return {
      maxPaolevel: safeMaxPaolevel,
      tier: tier,
    };
  }

  function resolveFireSafeMaxPaolevel(candidate, scoreInfo, state, bounds, fireMode) {
    var tier = String(scoreInfo && scoreInfo.tier || "");
    var modeName = String(fireMode || "");
    var roomResolvedHitCount = Math.max(toInt(state && state.roomResolvedHitCount, 0), 0);
    var roomProfitRaw = toNumber(state && state.roomProfitRaw, 0);
    var safeMaxPaolevel = Math.max(toInt(bounds && bounds.min, 1), 1);
    if (
      ("normal" === modeName || "post_hit_followup" === modeName) &&
      "primary" === tier &&
      roomResolvedHitCount > 0 &&
      roomProfitRaw >= 0
    ) {
      safeMaxPaolevel = getFinalPrimarySafePaolevel(bounds);
    }
    return {
      maxPaolevel: safeMaxPaolevel,
      tier: tier,
      fireMode: modeName,
      targetId: Number(candidate && (candidate.tableEntityID || candidate.symbolID || 0)) || 0,
    };
  }

  function resolveDesiredPaolevel(roomStatus, analysis, config, betRuntime, state) {
    var bounds = readRoomBounds(roomStatus.currentRoomSize, config);
    var currentPaolevel = Math.max(
      toInt(betRuntime && betRuntime.currentPaolevel, bounds.min),
      1
    );
    var desiredPaolevel = bounds.min;
    var reason = "yield_room_min";
    var combatPolicy = buildCombatPolicy(state, config, analysis);
    var roomResolvedShotCount = Math.max(toInt(state && state.roomResolvedShotCount, 0), 0);
    var roomResolvedHitCount = Math.max(toInt(state && state.roomResolvedHitCount, 0), 0);
    var roomPeakProfitRaw = Math.max(toNumber(state && state.roomPeakProfitRaw, 0), 0);
    var roomProfitRaw = toNumber(state && state.roomProfitRaw, 0);
    var platformWaterProfile = pickObject(state && state.platformWaterProfile);
    var platformWaterScore = Number(platformWaterProfile.score || 0) || 0;
    var usablePeerNetRatio = getPlatformUsablePeerNetRatio(platformWaterProfile);
    var waterActionGuard = buildPlatformWaterActionGuard(state, config);
    var postHitFollowupRampReady = canPostHitFollowupRampFire(
      roomStatus,
      analysis,
      state,
      config,
      combatPolicy
    );
    var postHitFollowupDesiredPaolevel = clamp(
      Math.max(
        bounds.min,
        Math.min(
          Math.max(toInt(config && config.postHitFollowupMaxPaolevel, 2), bounds.min),
          bounds.max
        )
      ),
      bounds.min,
      bounds.max
    );
    var roomMinResolvedShotsBeforeRamp = Math.max(
      toInt(config && config.roomMinResolvedShotsBeforeRamp, 1),
      0
    );
    var requireRoomHitBeforeRamp =
      void 0 === (config && config.requireRoomHitBeforeRamp)
        ? true
        : !!config.requireRoomHitBeforeRamp;
    if (!combatPolicy.allowCombat) {
      reason = "yield_water_guarded";
    } else if (
      roomResolvedShotCount < roomMinResolvedShotsBeforeRamp ||
      (requireRoomHitBeforeRamp && roomResolvedHitCount < 1)
    ) {
      reason = requireRoomHitBeforeRamp ? "yield_min_until_room_hit" : "yield_min_probe";
    } else if (!combatPolicy.probeOnly && analysis.highConfirmed && combatPolicy.allowHighRamp) {
      desiredPaolevel = bounds.max;
      reason = "yield_high_confirmed";
    } else if (
      !combatPolicy.probeOnly &&
      (analysis.highConfirmed || analysis.mediumConfirmed) &&
      combatPolicy.allowMediumRamp
    ) {
      desiredPaolevel = bounds.middle;
      reason = "yield_medium_confirmed";
    }
    if (
      postHitFollowupRampReady &&
      desiredPaolevel < postHitFollowupDesiredPaolevel
    ) {
      desiredPaolevel = postHitFollowupDesiredPaolevel;
      reason = "yield_post_hit_followup_window";
    }
    if (roomResolvedHitCount > 0) {
      var maxRampStepsWithoutHighConfirmed = clamp(
        toInt(config && config.postHitMaxRampStepsWithoutHighConfirmed, 0),
        0,
        Math.max(bounds.max - bounds.min, 0)
      );
      var allowPostHitHighConfirmedRamp = !!(
        analysis.highConfirmed &&
        !combatPolicy.probeOnly &&
        roomResolvedHitCount >= Math.max(toInt(config && config.postHitRampMinHitCount, 1), 1) &&
        roomProfitRaw >= Math.max(toNumber(config && config.postHitRampMinProfitRaw, 0.6), 0)
      );
      var maxRampStepsWithHighConfirmed = clamp(
        toInt(
          config && config.postHitMaxRampStepsWithHighConfirmed,
          allowPostHitHighConfirmedRamp ? 1 : 0
        ),
        0,
        Math.max(bounds.max - bounds.min, 0)
      );
      var postHitMaxPaolevel = clamp(
        Math.max(
          postHitFollowupRampReady ? postHitFollowupDesiredPaolevel : bounds.min,
          bounds.min +
            (analysis.highConfirmed
              ? maxRampStepsWithHighConfirmed
              : maxRampStepsWithoutHighConfirmed)
        ),
        bounds.min,
        bounds.max
      );
      if (desiredPaolevel > postHitMaxPaolevel) {
        desiredPaolevel = postHitMaxPaolevel;
        reason = analysis.highConfirmed
          ? "yield_post_hit_high_confirmed_cap"
          : "yield_post_hit_profit_hold";
      }
    }
    if (
      desiredPaolevel > bounds.min &&
      (
        waterActionGuard.hardBlocked ||
        !waterActionGuard.directFireReady ||
        roomResolvedShotCount <
          Math.max(toInt(config && config.rampMinResolvedShotsBeforeScaleUp, 2), 1) ||
        roomResolvedHitCount <
          Math.max(toInt(config && config.rampMinResolvedHitsBeforeScaleUp, 1), 1) ||
        roomProfitRaw <
          Math.max(toNumber(config && config.rampMinRoomProfitRawBeforeScaleUp, 0), 0) ||
        platformWaterScore <
          Math.max(toNumber(config && config.rampStrongWaterMinScore, 56), 1) ||
        usablePeerNetRatio <
          clamp(toNumber(config && config.rampStrongWaterMinPeerNetRatio, 0), -1, 1)
      )
    ) {
      desiredPaolevel = bounds.min;
      reason = waterActionGuard.hardBlocked ? "yield_drain_hard_block" : "yield_scaleup_guarded";
    }
    var desiredSafeLimit = resolveDesiredSafeMaxPaolevel(
      analysis,
      state,
      bounds,
      combatPolicy
    );
    if (desiredPaolevel > desiredSafeLimit.maxPaolevel) {
      desiredPaolevel = desiredSafeLimit.maxPaolevel;
      reason =
        desiredSafeLimit.maxPaolevel > bounds.min
          ? "yield_final_primary_cap"
          : "yield_final_safe_min";
    }
    desiredPaolevel = clamp(desiredPaolevel, bounds.min, bounds.max);
    return {
      bounds: bounds,
      currentPaolevel: currentPaolevel,
      desiredPaolevel: desiredPaolevel,
      reason: reason,
      combatPolicy: combatPolicy,
      roomResolvedShotCount: roomResolvedShotCount,
      roomResolvedHitCount: roomResolvedHitCount,
      roomPeakProfitRaw: roomPeakProfitRaw,
    };
  }

  function getPostHitProfitGuard(state, config) {
    var roomResolvedHitCount = Math.max(toInt(state && state.roomResolvedHitCount, 0), 0);
    var roomProfitRaw = toNumber(state && state.roomProfitRaw, 0);
    var roomPeakProfitRaw = Math.max(toNumber(state && state.roomPeakProfitRaw, 0), 0);
    var givebackRaw = Math.max(roomPeakProfitRaw - roomProfitRaw, 0);
    var givebackRatio = roomPeakProfitRaw > 0 ? givebackRaw / roomPeakProfitRaw : 0;
    return {
      armed: roomResolvedHitCount > 0 && roomPeakProfitRaw > 0,
      roomResolvedHitCount: roomResolvedHitCount,
      roomProfitRaw: roomProfitRaw,
      roomPeakProfitRaw: roomPeakProfitRaw,
      givebackRaw: givebackRaw,
      givebackRatio: givebackRatio,
      maxGivebackRatio: clamp(toNumber(config && config.postHitMaxGivebackRatio, 0.65), 0.05, 0.95),
      minPeakProfitRaw: Math.max(toNumber(config && config.postHitProfitProtectMinRaw, 0), 0),
      leaveWhenProfitTurnsNegative:
        void 0 === (config && config.postHitLeaveWhenProfitTurnsNegative)
          ? true
          : !!config.postHitLeaveWhenProfitTurnsNegative,
    };
  }

  function shouldLeaveByPostHitProfitGuard(guard) {
    if (!guard || !guard.armed || !(guard.roomPeakProfitRaw >= guard.minPeakProfitRaw)) {
      return false;
    }
    return !!(
      guard.givebackRatio >= guard.maxGivebackRatio ||
      (guard.leaveWhenProfitTurnsNegative && guard.roomProfitRaw <= 0 && guard.givebackRaw > 0)
    );
  }

  function applyBetStep(betRuntime, desiredPaolevel, state, config) {
    var current = Math.max(toInt(betRuntime && betRuntime.currentPaolevel, 0), 0);
    if (config && config.monitorOnly) {
      return {
        changed: false,
        currentPaolevel: current,
        desiredPaolevel: current > 0 ? current : desiredPaolevel,
        reason: "monitor_only_bet_locked",
      };
    }
    if (!(desiredPaolevel > 0) || !(current > 0) || current === desiredPaolevel) {
      return {
        changed: false,
        currentPaolevel: current,
        desiredPaolevel: desiredPaolevel,
        reason: current === desiredPaolevel ? "bet_already_synced" : "bet_sync_skipped",
      };
    }
    if (isRoomNativeSettling(state, config)) {
      return {
        changed: false,
        currentPaolevel: current,
        desiredPaolevel: desiredPaolevel,
        reason: "room_native_settling",
        remainingMs: Math.max((Number(state && state.roomNativeStableAt || 0) || 0) - Date.now(), 0),
      };
    }
    var now = Date.now();
    var minChangeIntervalMs = Math.max(toInt(config.betChangeCooldownMs, config.intervalMs), 800);
    if (now - state.lastBetChangeAt < minChangeIntervalMs) {
      return {
        changed: false,
        currentPaolevel: current,
        desiredPaolevel: desiredPaolevel,
        reason: "bet_change_cooldown",
        remainingMs: minChangeIntervalMs - (now - state.lastBetChangeAt),
      };
    }
    var direction = desiredPaolevel > current ? "add" : "subtract";
    var count = Math.min(
      Math.abs(desiredPaolevel - current),
      Math.max(toInt(config.maxStepPerTick, 1), 1)
    );
    var ok = !!changeBet({
      direction: direction,
      count: count,
    });
    if (ok) {
      state.lastBetChangeAt = now;
    }
    return {
      changed: ok,
      ok: ok,
      direction: direction,
      count: count,
      currentPaolevel: current,
      desiredPaolevel: desiredPaolevel,
      reason: ok ? "bet_changed" : "bet_change_failed",
    };
  }

  function buildIdleKeepaliveDelayMs(config) {
    var minMs = Math.max(toInt(config && config.idleKeepaliveMinSeconds, 45), 10) * 1000;
    var maxMs = Math.max(
      toInt(config && config.idleKeepaliveMaxSeconds, 75),
      Math.max(toInt(config && config.idleKeepaliveMinSeconds, 45), 10)
    ) * 1000;
    return minMs + Math.floor(Math.random() * Math.max(maxMs - minMs + 1, 1));
  }

  function canPostHitFollowupRampFire(roomStatus, analysis, state, config, combatPolicy) {
    var outcome = pickObject(state && state.lastResolvedFireOutcome);
    var profile = pickObject(state && state.platformWaterProfile);
    var bestCandidate = pickObject(analysis && analysis.profitCandidate);
    var bestScoreInfo = pickObject(bestCandidate.scoreInfo);
    var waterActionGuard = buildPlatformWaterActionGuard(state, config);
    var stableSeenTicks = Number(
      bestScoreInfo.captureStats && bestScoreInfo.captureStats.consecutiveSeenTicks || 0
    ) || 0;
    if (!roomStatus || !roomStatus.inRoom) {
      return false;
    }
    if ((Number(state && state.postHitFollowupShotsUsed || 0) || 0) >= Math.max(
      toInt(config && config.postHitFollowupMaxShotsPerRoom, 1),
      0
    )) {
      return false;
    }
    if (!(Number(state && state.roomResolvedHitCount || 0) > 0)) {
      return false;
    }
    if ("hit" !== String(outcome.outcome || "")) {
      return false;
    }
    if (
      true === !!(config && config.postHitFollowupRequireBoundHit) &&
      !!outcome.targetBindingMismatch
    ) {
      return false;
    }
    if (
      Date.now() - (Number(outcome.resolvedAt || 0) || 0) >
      Math.max(toInt(config && config.postHitFollowupWindowMs, 4500), 500)
    ) {
      return false;
    }
    if (
      Number(outcome.totalWinRaw || 0) <
      normalizeExternalMoneyToRaw(toNumber(config && config.postHitFollowupMinWinRaw, 0.4))
    ) {
      return false;
    }
    if (
      "warming" !== String(profile.level || "") &&
      "open_suspected" !== String(profile.level || "")
    ) {
      return false;
    }
    if (waterActionGuard.hardBlocked || !waterActionGuard.directFireReady) {
      return false;
    }
    if (!bestCandidate || !bestCandidate.node) {
      return false;
    }
    if ("blacklist" === String(bestScoreInfo.tier || "")) {
      return false;
    }
    if (
      Number(bestCandidate.score || 0) <
      Math.max(toNumber(config && config.postHitFollowupMinCandidateScore, 88), 1)
    ) {
      return false;
    }
    if (
      Number(bestCandidate.hitProbability || 0) <
      Math.max(toNumber(config && config.postHitFollowupMinHitProbability, 96), 1)
    ) {
      return false;
    }
    if (
      stableSeenTicks <
      Math.max(toInt(config && config.postHitFollowupMinStableSeenTicks, 5), 1)
    ) {
      return false;
    }
    if (
      combatPolicy &&
      false === combatPolicy.allowCombat &&
      "waiting_self_room_recovery" === String(combatPolicy.reason || "")
    ) {
      return false;
    }
    return true;
  }

  function getIdleKeepaliveStatus(roomStatus, state, config, combatPolicy) {
    if (!roomStatus || !roomStatus.inRoom) {
      return {
        ready: false,
        reason: "idle_keepalive_room_missing",
      };
    }
    if (config && false === config.idleKeepaliveEnabled) {
      return {
        ready: false,
        reason: "idle_keepalive_disabled",
      };
    }
    if (isRoomNativeSettling(state, config)) {
      return {
        ready: false,
        reason: "room_native_settling",
        remainingMs: Math.max((Number(state && state.roomNativeStableAt || 0) || 0) - Date.now(), 0),
      };
    }
    var profile = pickObject(state && state.platformWaterProfile);
    if (
      combatPolicy &&
      "waiting_platform_peer_recovery" === String(combatPolicy.reason || "")
    ) {
      return {
        ready: false,
        reason: "idle_keepalive_blocked_peer_recovery",
      };
    }
    if (getPlatformUsablePeerNetRatio(profile) < 0) {
      return {
        ready: false,
        reason: "idle_keepalive_blocked_negative_peer_net",
      };
    }
    if ((Number(state && state.roomProfitRaw || 0) || 0) < 0) {
      return {
        ready: false,
        reason: "idle_keepalive_blocked_room_loss",
      };
    }
    if ((Number(state && state.consecutiveMissShots || 0) || 0) > 0) {
      return {
        ready: false,
        reason: "idle_keepalive_blocked_after_miss",
      };
    }
    if ((Number(state && state.roomResolvedShotCount || 0) || 0) > 0) {
      return {
        ready: false,
        reason: "idle_keepalive_blocked_after_shot",
      };
    }
    var now = Date.now();
    var readyWarmupMs = Math.max(
      toInt(config && config.idleKeepaliveRequireReadySeconds, 15),
      0
    ) * 1000;
    if (
      readyWarmupMs > 0 &&
      Number(state && state.roomReadyAt || 0) > 0 &&
      now - Number(state.roomReadyAt || 0) < readyWarmupMs
    ) {
      return {
        ready: false,
        reason: "idle_keepalive_room_ready_warmup",
        remainingMs: readyWarmupMs - (now - Number(state.roomReadyAt || 0)),
      };
    }
    var anchorAt = Math.max(
      Number(state && state.lastFireAt || 0) || 0,
      Number(state && state.roomReadyAt || 0) || 0,
      Number(state && state.roomEnteredAt || 0) || 0
    );
    if (!(anchorAt > 0)) {
      return {
        ready: false,
        reason: "idle_keepalive_anchor_missing",
      };
    }
    if (!(Number(state && state.roomIdleKeepaliveDueAt || 0) > anchorAt)) {
      state.roomIdleKeepaliveDueAt = anchorAt + buildIdleKeepaliveDelayMs(config);
    }
    if (now < Number(state.roomIdleKeepaliveDueAt || 0)) {
      return {
        ready: false,
        reason: "idle_keepalive_waiting",
        remainingMs: Number(state.roomIdleKeepaliveDueAt || 0) - now,
        dueAt: Number(state.roomIdleKeepaliveDueAt || 0) || 0,
      };
    }
    return {
      ready: true,
      reason: "idle_keepalive_due",
      dueAt: Number(state.roomIdleKeepaliveDueAt || 0) || 0,
    };
  }

  fireController.fireIdleKeepalive = function (
    roomStatus,
    analysis,
    state,
    config,
    betRuntime,
    combatPolicy
  ) {
    if (!(Number(analysis && analysis.candidateCount || 0) > 0)) {
      return {
        ok: false,
        fired: false,
        reason: "idle_keepalive_no_candidate",
      };
    }
    if (
      "no_bullet" ===
        String(state && state.lastNativeFireBlockDetail && state.lastNativeFireBlockDetail.code || "") &&
      (Number(state && state.roomResolvedShotCount || 0) || 0) <= 0
    ) {
      return {
        ok: false,
        fired: false,
        reason: "idle_keepalive_native_blocked",
      };
    }
    var idleStatus = getIdleKeepaliveStatus(roomStatus, state, config, combatPolicy);
    if (!idleStatus.ready) {
      return {
        ok: false,
        fired: false,
        reason: idleStatus.reason,
        idleStatus: idleStatus,
      };
    }
    if (
      getActivePendingFireCount(state) >=
      Math.max(toInt(config && config.maxPendingFireOutcomes, 1), 0)
    ) {
      return {
        ok: false,
        fired: false,
        reason: "pending_fire_outcome_waiting",
        idleStatus: idleStatus,
      };
    }
    var bounds = readRoomBounds(roomStatus && roomStatus.currentRoomSize, config);
    var currentPaolevel = Math.max(
      toInt(betRuntime && betRuntime.currentPaolevel, bounds.min),
      1
    );
    if (currentPaolevel !== bounds.min) {
      var betResult = applyBetStep(betRuntime, bounds.min, state, config);
      return {
        ok: false,
        fired: false,
        reason: betResult.changed ? "idle_keepalive_syncing_min_bet" : betResult.reason,
        idleStatus: idleStatus,
        betResult: betResult,
        desiredPaolevel: bounds.min,
      };
    }
    var candidate =
      analysis &&
      analysis.bestCandidate &&
      analysis.bestCandidate.node &&
      (!analysis.bestCandidate.scoreInfo ||
        "blacklist" !== String(analysis.bestCandidate.scoreInfo.tier || ""))
        ? analysis.bestCandidate
        : null;
    var fireContext = fireController.prepare(candidate, state, config, {
      requireCandidate: false,
      checkRoomSettling: true,
      recheckBeforeFire: false,
    });
    if (!fireContext.ok) {
      fireContext.idleStatus = idleStatus;
      return fireContext;
    }
    candidate = fireContext.candidate;
    var runtimeGuard = fireController.validateRuntime(fireContext, state, config, {
      unlockOnNativeBlocked: false,
    });
    if (runtimeGuard) {
      runtimeGuard.idleStatus = idleStatus;
      return runtimeGuard;
    }
    var execution = fireController.execute(fireContext, {
      lockTarget: true,
      cleanLockedWhenNoCandidate: true,
    });
    fireController.commit(fireContext, state, {
      resetIdleKeepaliveDueAt: true,
      pendingMeta: candidate
        ? {
            fireMode: "idle_keepalive",
            fireMethod: execution.fireMethod,
            hitProbability: 0,
            candidateScore: 0,
            tier: "",
            stableSeenTicks: 0,
            allowEmptyOddsProbe: false,
          }
        : null,
    });
    return {
      ok: true,
      fired: true,
      reason: "idle_keepalive_fire",
      keepalive: true,
      idleStatus: idleStatus,
      fireMethod: execution.fireMethod,
      target: cloneObject(state.lastTarget),
      desiredPaolevel: bounds.min,
      usedCandidate: !!candidate,
    };
  };

  function fireIdleKeepaliveShot(roomStatus, analysis, state, config, betRuntime, combatPolicy) {
    return fireController.fireIdleKeepalive(
      roomStatus,
      analysis,
      state,
      config,
      betRuntime,
      combatPolicy
    );
  }

  function buildStopLossState(balanceInput, state) {
    var runtime = balanceInput && "object" == typeof balanceInput ? balanceInput : null;
    var initialBalance = Math.max(toNumber(state.initialBalance, 0), 0);
    var stopLossRatio = clamp(toNumber(state.config.stopLossRatio, 0.05), 0.001, 0.9);
    var stopLossAmount = Math.max(
      toNumber(state.config.stopLossAmount, initialBalance * stopLossRatio),
      0
    );
    var stopBalance = Math.max(initialBalance - stopLossAmount, 0);
    var takeProfitRatio = Math.max(toNumber(state.config.takeProfitRatio, 0.12), 0);
    var takeProfitAmount = Math.max(
      toNumber(state.config.takeProfitAmount, initialBalance * takeProfitRatio),
      0
    );
    var takeProfitBalance = initialBalance + takeProfitAmount;
    var balance = Math.max(
      toNumber(runtime ? runtime.currentBalance : balanceInput, 0),
      0
    );
    var balanceAvailable = runtime
      ? false !== runtime.balanceAvailable && balance > 0
      : balance > 0;
    var usedFallbackBalance = runtime ? !!runtime.usedFallbackBalance : false;
    var hit =
      initialBalance > 0 &&
      balanceAvailable &&
      balance <= stopBalance;
    var takeProfitHit =
      initialBalance > 0 &&
      takeProfitAmount > 0 &&
      balanceAvailable &&
      balance >= takeProfitBalance;
    return {
      initialBalance: initialBalance,
      currentBalance: balance,
      stopLossRatio: stopLossRatio,
      stopLossAmount: stopLossAmount,
      stopBalance: stopBalance,
      hit: hit,
      takeProfitRatio: takeProfitRatio,
      takeProfitAmount: takeProfitAmount,
      takeProfitBalance: takeProfitBalance,
      takeProfitHit: takeProfitHit,
      balanceAvailable: !!balanceAvailable,
      usedFallbackBalance: !!usedFallbackBalance,
      balanceSource: runtime ? String(runtime.balanceSource || "") : "",
    };
  }

  function createState() {
    var builtInRemoteDefaults = getBuiltInRemoteServiceDefaults();
    return {
      active: false,
      timer: 0,
      nativeReady: false,
      initialBalance: 0,
      lastKnownBalance: 0,
      lastKnownBalanceAt: 0,
      stopLatched: false,
      stopLatchReason: "",
      roomEntryBalance: 0,
      roomProfitRaw: 0,
      roomPeakProfitRaw: 0,
      lastRoomProfitRaw: 0,
      badRoomStreak: 0,
      roomResolvedShotCount: 0,
      roomResolvedHitCount: 0,
      recentMissBlockedTargetId: 0,
      recentMissBlockedTargetUntil: 0,
      roomWarmingEmptyOddsFireCount: 0,
      warmingEmptyOddsCommitUntil: 0,
      consecutiveMissShots: 0,
      consecutiveMissShots: 0,
      targetOutcomeStats: {},
      roomTargetOutcomeStats: {},
      oddsOutcomeStats: {},
      adaptiveBlacklistTargetIds: [],
      adaptiveBlacklistOdds: [],
      roomTemporaryBlockedTargetIds: [],
      riskCooldownUntil: 0,
      weakSignalNeutralCount: 0,
      roomRotateIndex: 0,
      roomEnteredAt: 0,
      roomNativeStableAt: 0,
      roomReadyAt: 0,
      roomIdleKeepaliveDueAt: 0,
      roomScanConfirmedAt: 0,
      postHitFollowupShotsUsed: 0,
      lastBattleGuideDismissAt: 0,
      battleGuideDismissCount: 0,
      roomColdValidationProbeFired: false,
      coldRoomFollowupShotsRemaining: 0,
      coldRoomFollowupUntil: 0,
      latestAdaptiveBlacklistTarget: null,
      latestAdaptiveBlacklistOdd: null,
      latestRoomTemporaryBlockedTarget: null,
      lastAdaptiveBlacklistAt: 0,
      lastDesired: null,
      nextAutoJoinAt: 0,
      nextAutoJoinRoomSize: "",
      lastRoomKey: "",
      lastRoomActionAt: 0,
      lastRequestedRoomSize: "",
      lastDecisionAt: 0,
      lastDecision: null,
      lastBetChangeAt: 0,
      lastFireAt: 0,
      fireSequence: 0,
      observedSelfResolvedCount: 0,
      untrackedSelfResolvedCount: 0,
      lastAimSwitchAt: 0,
      aimReadyAt: 0,
      lastNativeRecoveryAt: 0,
      nativeFireRecoveryCount: 0,
      currentAttackModeId: 0,
      currentAttackModeLabel: "",
      lastTarget: null,
      pendingFireOutcomes: [],
      lastResolvedFireOutcome: null,
      lastUntrackedSelfResolvedOutcome: null,
      recentSyncOutcomes: [],
      recentSelfResolvedOutcomes: [],
      platformWaterProfile: null,
      platformWaterTrendHistory: [],
      lastConsolePlatformWaterSignature: "",
      lastConsoleResolvedShotId: 0,
      pendingLeavePlan: null,
      pendingLeaveTimer: 0,
      blockedReason: "",
      blockedReasonSinceAt: 0,
      blockedReasonLastSeenAt: 0,
      blockedReasonCount: 0,
      lastRoomStatus: null,
      lastAnalysis: null,
      lastFireAudit: null,
      nativeFireLeakCount: 0,
      nativeFireBlockedCount: 0,
      nativeContinuousFireCount: 0,
      targetBindingMismatchCount: 0,
      roomObservedSelfResolvedCount: 0,
      roomUntrackedSelfResolvedCount: 0,
      lastObservedSelfFireAt: 0,
      lastObservedSelfFireModeId: 0,
      lastObservedSelfFireModeLabel: "",
      lastObservedSelfFireTargetId: 0,
      lastObservedSelfFireTargetSN: 0,
      lastObservedSelfFireTraceId: 0,
      lastNativeFireBlockDetail: null,
      remoteSessionId: buildRuntimeSessionId(),
      remoteLogQueue: [],
      remoteLogFlushInFlight: false,
      remoteLastFlushAt: 0,
      remoteLastSuccessAt: 0,
      remoteLastHttpStatus: 0,
      remoteLastError: "",
      remoteLastErrorAt: 0,
      remoteConfigSyncInFlight: false,
      remoteLastConfigSyncAt: 0,
      remoteLastConfigSuccessAt: 0,
      remoteLastConfigHttpStatus: 0,
      remoteLastConfigError: "",
      remoteLastConfigErrorAt: 0,
      remoteSocketPacketQueue: [],
      remoteSocketPacketFlushInFlight: false,
      remoteSocketPacketLastFlushAt: 0,
      remoteSocketPacketLastSuccessAt: 0,
      remoteSocketPacketLastHttpStatus: 0,
      remoteSocketPacketLastError: "",
      remoteSocketPacketLastErrorAt: 0,
      remoteSocketPacketRecentSignatures: {},
      runtimeSocketHookInstalled: false,
      runtimeSocketWebSocketWrapped: false,
      runtimeSocketOriginalWebSocket: null,
      runtimeSocketExistingAttached: false,
      capture: {
        tickIndex: 0,
        lastUpdatedAt: 0,
        samples: {},
      },
      panel: {
        mounted: false,
        root: null,
        refreshTimer: 0,
        position: null,
        versionLabel: null,
        overview: null,
        waterTrendRoot: null,
        waterTrendPosition: null,
        waterTrendVersionLabel: null,
        waterTrend: null,
        status: null,
        initialBalanceInput: null,
        stopLossRatioInput: null,
        takeProfitRatioInput: null,
        remoteToggleButton: null,
        remoteConfigToggleButton: null,
        roomSelect: null,
      },
      config: {
        intervalMs: 1200,
        joinCooldownMs: 6000,
        roomWarmupMs: 10000,
        nativeSceneSettleMs: 3500,
        observeSeconds: 6,
        noCandidateLeaveSeconds: 8,
        scanUnconfirmedLeaveSeconds: 12,
        stopLossRatio: 0.05,
        takeProfitRatio: 0.12,
        maxStepPerTick: 1,
        defaultMinPaolevel: 1,
        defaultMaxPaolevel: 2,
        idleKeepaliveEnabled: false,
        idleKeepaliveMinSeconds: 45,
        idleKeepaliveMaxSeconds: 75,
        idleKeepaliveRequireReadySeconds: 22,
        postHitFollowupWindowMs: 4500,
        postHitFollowupMinWinRaw: 0.4,
        postHitFollowupMaxShotsPerRoom: 1,
        postHitFollowupMaxPaolevel: 2,
        postHitFollowupMinCandidateScore: 88,
        postHitFollowupMinHitProbability: 96,
        postHitFollowupMinStableSeenTicks: 5,
        postHitFollowupRequireBoundHit: true,
        strictHitTargetBinding: true,
        enableSelfLossStreakProbeBypass: false,
        mediumOddsThreshold: 18,
        highOddsThreshold: 30,
        mediumScoreThreshold: 55,
        highScoreThreshold: 90,
        minCandidateScore: 40,
        minHitProbability: 56,
        minStableSeenTicks: 2,
        manualFireCooldownMs: 700,
        nativeBlockedSoftRecoverThreshold: 1,
        nativeBlockedRecoveryCooldownMs: 500,
        nativeBlockedResetThreshold: 3,
        riskCooldownMs: 12000,
        maxConsecutiveMissShots: 3,
        missStreakLeaveThreshold: 4,
        precisionBlockedLeaveThreshold: 5,
        blockedDeadRoomLeaveThreshold: 7,
        blockedDeadRoomMinStayMs: 18000,
        blockedNoBulletLeaveThreshold: 4,
        blockedNoBulletMinStayMs: 7000,
        recentMissTargetBlockMs: 9000,
        blockedDeadRoomMinStayMs: 18000,
        recentMissTargetBlockMs: 9000,
        maxRoomLossRatio: 0,
        maxRoomLossRatio: 0,
        maxRoomLossAmount: void 0,
        aimModeWarmupMs: 500,
        betChangeCooldownMs: 1600,
        preferredRooms: ["small"],
        dynamicTargeting: true,
        targetFishIds: BUILT_IN_PRIMARY_TARGET_IDS.slice(),
        precisionPrimaryTargetIds: BUILT_IN_PRIMARY_TARGET_IDS.slice(),
        precisionSecondaryTargetIds: BUILT_IN_SECONDARY_TARGET_IDS.slice(),
        precisionBlacklistTargetIds: BUILT_IN_BLACKLIST_TARGET_IDS.slice(),
        precisionBlacklistMinTargetId: 100,
        precisionBlacklistMinSymbolId: 100,
        precisionBlacklistSymbolIds: [],
        precisionBlacklistOdds: BUILT_IN_BLACKLIST_ODDS.slice(),
        precisionBlacklistNameKeywords: ["财神"],
        hotObservationTargetIds: BUILT_IN_HOT_OBSERVATION_TARGET_IDS.slice(),
        warmObservationTargetIds: BUILT_IN_WARM_OBSERVATION_TARGET_IDS.slice(),
        hotObservationHourSlots: BUILT_IN_HOT_OBSERVATION_HOUR_SLOTS.slice(),
        warmObservationHourSlots: BUILT_IN_WARM_OBSERVATION_HOUR_SLOTS.slice(),
        hotObservationTargetScoreBonus: 10,
        warmObservationTargetScoreBonus: 5,
        hotObservationHourScoreBonus: 8,
        warmObservationHourScoreBonus: 4,
        adaptiveBlacklistEnabled: true,
        adaptiveBlacklistTargetMinSamples: 5,
        adaptiveBlacklistTargetMaxRtpRatio: 0.05,
        adaptiveBlacklistOddMinSamples: 5,
        adaptiveBlacklistOddMaxRtpRatio: 0.05,
        roomTemporaryTargetBlockEnabled: true,
        roomTemporaryTargetBlockMinSamples: 2,
        roomTemporaryTargetBlockMaxRtpRatio: 0.12,
        specialEventFishKinds: [],
        specialEventTargetIds: [],
        specialEventSymbolIds: [],
        specialEventNameKeywords: [],
        specialEventScoreBonus: 12,
        specialEventHitProbabilityBonus: 3,
        specialEventStableSeenTicksRelax: 2,
        specialEventWaterScoreRelax: 6,
        specialEventHighOddRateRelax: 0.12,
        specialEventHighMechanismRateRelax: 0.04,
        specialEventWindowMinCandidateScore: 84,
        specialEventWindowMinHitProbability: 92,
        specialEventWindowMinStableSeenTicks: 4,
        specialEventWindowMinWaterScore: 30,
        specialEventWindowMinHighMechanismRate: 0.08,
        specialEventWindowMinOpenFeatureRate: 0.16,
        specialEventWindowMinOpenFeatureHitRate: 0.06,
        strictWhitelistWhenOddsEmpty: false,
        recheckBeforeFire: true,
        autoJoin: true,
        bootstrapOnLoad: true,
        autoDismissBattleGuide: true,
        battleGuideDismissCooldownMs: 1200,
        battleGuideDismissMaxAttemptsPerRoom: 3,
        roomPaolevelConfig: {
          small: { min: 1, max: 2 },
          middle: { min: 1, max: 2 },
          large: { min: 1, max: 2 },
        },
        allowBootstrapJoinWhenUnknown: false,
        allowProbeFire: true,
        probeAfterObserveSeconds: 4,
        probeCandidateScoreThreshold: 60,
        probeHitProbabilityThreshold: 82,
        allowWarmingNeutralProbe: false,
        warmingNeutralProbeMinCandidateScore: 90,
        warmingNeutralProbeMinHitProbability: 97,
        warmingNeutralProbeMinStableSeenTicks: 4,
        warmingNeutralProbeMinWaterScore: 34,
        warmingNeutralProbeMinHighOddRate: 0.58,
        warmingNeutralProbeMinPeerNetRatio: 0,
        warmingNeutralProbeMinHighMechanismRate: 0.03,
        warmingNeutralProbeFallbackWaterScore: 39,
        warmingNeutralProbeFallbackPeerNetRatio: 0.05,
        warmingNeutralProbeFallbackHighOddRate: 0.52,
        warmingNeutralProbeMinDistanceOpenFireScore: 28,
        selfLossStreakProbeMinWaterScore: 46,
        selfLossStreakProbeMinPeerNetRatio: 0.15,
        selfLossStreakProbeMinHighOddRate: 0.2,
        selfLossStreakProbeMinCandidateScore: 140,
        selfLossStreakProbeMinHitProbability: 98,
        selfLossStreakProbeMinStableSeenTicks: 4,
        selfLossStreakProbeMaxRoomLossRaw: 0.35,
        selfLossStreakPrecisionProbeTargetIds: [2, 3, 19],
        selfLossStreakPrecisionProbeMinCandidateScore: 150,
        selfLossStreakPrecisionProbeMinHitProbability: 98,
        selfLossStreakPrecisionProbeMinStableSeenTicks: 6,
        selfLossStreakPrecisionProbeMaxRoomLossRaw: 0.25,
        selfLossStreakPrecisionProbeMaxMissShots: 2,
        selfLossStreakContinuationMinModeRate: 0.2,
        selfLossStreakContinuationMinUsableSamples: 12,
        selfLossStreakContinuationMinCandidateScore: 96,
        selfLossStreakContinuationMinHitProbability: 97,
        selfLossStreakContinuationMinStableSeenTicks: 4,
        selfLossStreakContinuationMaxRoomLossRaw: 0.45,
        selfLossStreakContinuationMaxMissShots: 3,
        allowColdRoomValidationProbe: false,
        coldRoomValidationObserveSeconds: 24,
        coldRoomValidationMinSamples: 220,
        coldRoomValidationMinCandidateScore: 93,
        coldRoomValidationMinHitProbability: 98,
        coldRoomValidationMinStableSeenTicks: 12,
        coldRoomValidationMinWaterScore: 28,
        coldRoomValidationMinPeerNetRatio: -0.3,
        coldRoomValidationMinHighOddRate: 0.18,
        coldRoomFollowupEnabled: true,
        coldRoomFollowupWindowSeconds: 12,
        coldRoomFollowupMaxShots: 2,
        coldRoomFollowupMinCandidateScore: 90,
        coldRoomFollowupMinHitProbability: 96,
        coldRoomFollowupMinStableSeenTicks: 6,
        allowEmptyOddsProbeForNeutral: true,
        emptyOddsProbeMinCandidateScore: 92,
        emptyOddsProbeMinHitProbability: 90,
        emptyOddsProbeMinStableSeenTicks: 4,
        emptyOddsProbeMinDistanceOpenFireScore: 28,
        weakSignalNeutralThreshold: 999,
        weakSignalMinHitProbability: 90,
        weakSignalMinStableSeenTicks: 8,
        weakSignalMinRoomStaySeconds: 30,
        blockedRoomLeaveSeconds: 45,
        blockedRoomLeaveMinRoomStaySeconds: 30,
        blockedRoomLeaveWarmingMinScore: 42,
        blockedRoomLeaveWarmingExtraSeconds: 30,
        blockedRoomLeaveReasons: [],
        peerRecoveryBypassMinCandidateScore: 92,
        peerRecoveryBypassMinHitProbability: 97,
        peerRecoveryBypassMinStableSeenTicks: 5,
        peerRecoveryBypassMinWaterScore: 42,
        peerRecoveryBypassMinHighOddRate: 0.64,
        peerRecoveryBypassMinHighMechanismRate: 0.06,
        postHitMaxRampStepsWithoutHighConfirmed: 0,
        postHitMaxRampStepsWithHighConfirmed: 1,
        postHitRampMinProfitRaw: 1.2,
        postHitRampMinHitCount: 2,
        rampMinResolvedShotsBeforeScaleUp: 2,
        rampMinResolvedHitsBeforeScaleUp: 1,
        rampMinRoomProfitRawBeforeScaleUp: 0,
        rampStrongWaterMinScore: 56,
        rampStrongWaterMinPeerNetRatio: 0,
        postHitMaxGivebackRatio: 0.65,
        postHitProfitProtectMinRaw: 0,
        postHitLeaveWhenProfitTurnsNegative: true,
        postHitProfitProtectMinRaw: 0,
        postHitLeaveWhenProfitTurnsNegative: true,
        platformWaterWindowSeconds: 120,
        platformWaterMaxRecords: 320,
        platformWaterMinSamples: 36,
        platformWaterBaselineHitRate: 0.1,
        platformWaterBaselineHighMechanismRate: 0.035,
        platformWaterBigWinOddThreshold: 20,
        platformWaterWarmScoreThreshold: 34,
        platformWaterOpenScoreThreshold: 56,
        platformDrainRecentWindowShots: 4,
        platformDrainRecentConsecutiveBlock: 2,
        platformDrainRecentCountBlock: 2,
        platformDrainRecentLossCountBlock: 2,
        platformDrainHardBlockMinRate: 0.08,
        platformDrainHardBlockMinPeerNetRatio: 0,
        platformDirectFireMinWaterScore: 48,
        platformDirectFireMinHighOddRate: 0.18,
        platformDirectFireMinPeerNetRatio: 0.02,
        platformDirectFireMaxDrainMechanismRate: 0.06,
        platformDirectFireMaxRoomLossRaw: 0.05,
        platformWaterInsufficientHoldSeconds: 45,
        combatPeerNetFloor: -0.05,
        combatPeerHitFloorRatio: 0.55,
        combatWarmingPeerHitFloor: 0.025,
        combatOpenPeerHitFloor: 0.02,
        combatSelfNetFloor: -0.2,
        combatSelfRecoveryMinSamples: 5,
        peerHotSelfColdBlockEnabled: true,
        peerHotSelfColdBlockMinPeerNetRatio: 0.08,
        peerHotSelfColdBlockMaxSelfNetRatio: -0.35,
        peerHotSelfColdBlockMaxHighMechanismRate: 0.02,
        peerHotSelfColdBlockMinSelfSamples: 4,
        allowWarmingEmptyOddsPrecision: true,
        warmingEmptyOddsMinCandidateScore: 94,
        warmingEmptyOddsMinHitProbability: 98,
        warmingEmptyOddsMinStableSeenTicks: 8,
        warmingEmptyOddsMinWaterScore: 60,
        warmingEmptyOddsMinHighOddRate: 0.67,
        warmingEmptyOddsMinHighMechanismRate: 0.06,
        warmingEmptyOddsMinPeerNetRatio: 0,
        warmingEmptyOddsMinRoomStaySeconds: 18,
        warmingEmptyOddsWaitedMinCandidateScore: 92,
        warmingEmptyOddsWaitedMinHitProbability: 98,
        warmingEmptyOddsWaitedMinStableSeenTicks: 6,
        warmingEmptyOddsWaitedMinWaterScore: 50,
        warmingEmptyOddsWaitedMinHighOddRate: 0.6,
        warmingEmptyOddsWaitedMinHighMechanismRate: 0.04,
        warmingEmptyOddsStrongHotMinCandidateScore: 94,
        warmingEmptyOddsStrongHotMinHitProbability: 98,
        warmingEmptyOddsStrongHotMinStableSeenTicks: 16,
        warmingEmptyOddsStrongHotMinWaterScore: 52,
        warmingEmptyOddsStrongHotMinHighOddRate: 0.58,
        warmingEmptyOddsStrongHotMinPeerNetRatio: -0.05,
        warmingEmptyOddsCommitWindowMs: 3500,
        warmingEmptyOddsCommitMinCandidateScore: 91,
        warmingEmptyOddsCommitMinHitProbability: 98,
        warmingEmptyOddsCommitMinStableSeenTicks: 6,
        warmingEmptyOddsCommitMinWaterScore: 48,
        warmingEmptyOddsCommitMinHighOddRate: 0.56,
        warmingEmptyOddsCommitMinHighMechanismRate: 0.05,
        warmingEmptyOddsMaxShotsPerRoom: 1,
        maxPendingFireOutcomes: 1,
        pendingFireOutcomeTimeoutMs: 2800,
        roomMinResolvedShotsBeforeRamp: 1,
        requireRoomHitBeforeRamp: true,
        postLeaveRejoinMinDelayMs: 7000,
        postLeaveRejoinMaxDelayMs: 12000,
        fastLeaveRejoinMinDelayMs: 4000,
        fastLeaveRejoinMaxDelayMs: 7000,
        lossRoomRejoinMinDelayMs: 12000,
        lossRoomRejoinMaxDelayMs: 18000,
        badRoomPauseThreshold: 3,
        badRoomPauseMs: 25000,
        badRoomPauseMinResolvedShots: 2,
        badRoomPauseMinLossRaw: 0.35,
        humanLeaveMinDelayMs: 1200,
        humanLeaveMaxDelayMs: 2400,
        consoleLogging: true,
        remoteLoggingEnabled: builtInRemoteDefaults.remoteLoggingEnabled,
        remoteConfigEnabled: builtInRemoteDefaults.remoteConfigEnabled,
        remoteServiceBaseUrl: builtInRemoteDefaults.remoteServiceBaseUrl,
        remoteIngestPath: builtInRemoteDefaults.remoteIngestPath,
        remoteSocketPacketIngestPath: builtInRemoteDefaults.remoteSocketPacketIngestPath,
        remoteConfigPath: builtInRemoteDefaults.remoteConfigPath,
        remoteClientId: builtInRemoteDefaults.remoteClientId,
        remoteApiKey: builtInRemoteDefaults.remoteApiKey,
        remoteFlushIntervalMs: builtInRemoteDefaults.remoteFlushIntervalMs,
        remoteLoggingBatchSize: builtInRemoteDefaults.remoteLoggingBatchSize,
        remoteQueueMax: builtInRemoteDefaults.remoteQueueMax,
        remoteConfigRefreshMs: builtInRemoteDefaults.remoteConfigRefreshMs,
        monitorOnly: false,
      },
    };
  }

  var runtimeState = createState();
  runtimeState.config = mergeConfig(readLocalSettings());

  function clearTimer() {
    if (runtimeState.timer) {
      clearInterval(runtimeState.timer);
      runtimeState.timer = 0;
    }
  }

  function rememberDecision(decision) {
    var now = Date.now();
    if (decision && "object" == typeof decision) {
      decision.monitorOnly = !!runtimeState.config.monitorOnly;
      decision.platformWaterProfile = cloneObject(runtimeState.platformWaterProfile);
      decision.lastResolvedFireOutcome = cloneObject(runtimeState.lastResolvedFireOutcome);
      decision.pendingFireOutcome = getLatestPendingFireOutcome(runtimeState);
      decision.lastFireAudit = cloneObject(runtimeState.lastFireAudit);
      decision.nativeFireLeakCount = Number(runtimeState.nativeFireLeakCount || 0) || 0;
      decision.nativeContinuousFireCount =
        Number(runtimeState.nativeContinuousFireCount || 0) || 0;
      decision.targetBindingMismatchCount =
        Number(runtimeState.targetBindingMismatchCount || 0) || 0;
      decision.currentAttackModeId = Number(runtimeState.currentAttackModeId || 0) || 0;
      decision.currentAttackModeLabel = String(runtimeState.currentAttackModeLabel || "");
      decision.lastObservedSelfFireAt = Number(runtimeState.lastObservedSelfFireAt || 0) || 0;
      decision.lastObservedSelfFireModeId =
        Number(runtimeState.lastObservedSelfFireModeId || 0) || 0;
      decision.lastObservedSelfFireModeLabel =
        String(runtimeState.lastObservedSelfFireModeLabel || "");
      decision.nativeFireBlockedCount =
        Number(runtimeState.nativeFireBlockedCount || 0) || 0;
      decision.nativeFireRecoveryCount =
        Number(runtimeState.nativeFireRecoveryCount || 0) || 0;
      decision.recentMissBlockedTargetId =
        Number(runtimeState.recentMissBlockedTargetId || 0) || 0;
      decision.recentMissBlockedRemainingMs = Math.max(
        (Number(runtimeState.recentMissBlockedTargetUntil || 0) || 0) - now,
        0
      );
      decision.lastNativeFireBlockDetail = runtimeState.lastNativeFireBlockDetail
        ? cloneObject(runtimeState.lastNativeFireBlockDetail)
        : null;
      decision.roomResolvedShotCount = Number(runtimeState.roomResolvedShotCount || 0) || 0;
      decision.roomResolvedHitCount = Number(runtimeState.roomResolvedHitCount || 0) || 0;
      decision.roomObservedSelfResolvedCount =
        Number(runtimeState.roomObservedSelfResolvedCount || 0) || 0;
      decision.roomUntrackedSelfResolvedCount =
        Number(runtimeState.roomUntrackedSelfResolvedCount || 0) || 0;
      decision.recentSelfResolvedOutcomes = cloneArray(
        runtimeState.recentSelfResolvedOutcomes
      );
      decision.pendingLeavePlan = runtimeState.pendingLeavePlan
        ? cloneObject(runtimeState.pendingLeavePlan)
        : null;
      decision.adaptiveBlacklistTargetCount = Array.isArray(runtimeState.adaptiveBlacklistTargetIds)
        ? runtimeState.adaptiveBlacklistTargetIds.length
        : 0;
      decision.adaptiveBlacklistOddCount = Array.isArray(runtimeState.adaptiveBlacklistOdds)
        ? runtimeState.adaptiveBlacklistOdds.length
        : 0;
      decision.latestAdaptiveBlacklistTarget = cloneObject(runtimeState.latestAdaptiveBlacklistTarget);
      decision.latestAdaptiveBlacklistOdd = cloneObject(runtimeState.latestAdaptiveBlacklistOdd);
      decision.lastAdaptiveBlacklistAt = Number(runtimeState.lastAdaptiveBlacklistAt || 0) || 0;
    }
    var decisionType = String(decision && decision.type || "");
    var decisionReason = String(decision && decision.reason || "");
    var blockedReasonActive = !!(
      ("observe" === decisionType || "attack_waiting" === decisionType) &&
      isBlockedRoomLeaveReason(runtimeState.config, decisionReason)
    );
    if (blockedReasonActive) {
      if (runtimeState.blockedReason === decisionReason && runtimeState.blockedReasonSinceAt > 0) {
        runtimeState.blockedReasonLastSeenAt = now;
        runtimeState.blockedReasonCount = (Number(runtimeState.blockedReasonCount || 0) || 0) + 1;
      } else {
        runtimeState.blockedReason = decisionReason;
        runtimeState.blockedReasonSinceAt = now;
        runtimeState.blockedReasonLastSeenAt = now;
        runtimeState.blockedReasonCount = 1;
      }
    } else {
      runtimeState.blockedReason = "";
      runtimeState.blockedReasonSinceAt = 0;
      runtimeState.blockedReasonLastSeenAt = 0;
      runtimeState.blockedReasonCount = 0;
    }
    runtimeState.lastDecisionAt = now;
    runtimeState.lastDecision = decision || null;
    syncPanelStatus();
    logDecisionToConsole(runtimeState.lastDecision);
    return runtimeState.lastDecision;
  }

  function mergeConfig(input) {
    var source = pickObject(input);
    var next = cloneObject(runtimeState.config);
    next.intervalMs = Math.max(toInt(source.intervalMs, next.intervalMs), 800);
    next.joinCooldownMs = Math.max(toInt(source.joinCooldownMs, next.joinCooldownMs), 1000);
    next.roomWarmupMs = Math.max(toInt(source.roomWarmupMs, next.roomWarmupMs), 0);
    next.nativeSceneSettleMs = Math.max(
      toInt(source.nativeSceneSettleMs, next.nativeSceneSettleMs),
      0
    );
    next.observeSeconds = Math.max(toInt(source.observeSeconds, next.observeSeconds), 0);
    next.noCandidateLeaveSeconds = Math.max(
      toInt(source.noCandidateLeaveSeconds, next.noCandidateLeaveSeconds),
      0
    );
    next.scanUnconfirmedLeaveSeconds = Math.max(
      toInt(source.scanUnconfirmedLeaveSeconds, next.scanUnconfirmedLeaveSeconds),
      0
    );
    next.platformWaterInsufficientHoldSeconds = Math.max(
      toInt(
        source.platformWaterInsufficientHoldSeconds,
        next.platformWaterInsufficientHoldSeconds
      ),
      0
    );
    next.consoleLogging =
      void 0 === source.consoleLogging ? !!next.consoleLogging : !!source.consoleLogging;
    next.remoteLoggingEnabled =
      void 0 === source.remoteLoggingEnabled
        ? !!next.remoteLoggingEnabled
        : !!source.remoteLoggingEnabled;
    next.remoteConfigEnabled =
      void 0 === source.remoteConfigEnabled
        ? !!next.remoteConfigEnabled
        : !!source.remoteConfigEnabled;
    next.remoteServiceBaseUrl =
      void 0 === source.remoteServiceBaseUrl
        ? String(next.remoteServiceBaseUrl || "")
        : String(source.remoteServiceBaseUrl || "").trim();
    next.remoteIngestPath =
      void 0 === source.remoteIngestPath
        ? String(next.remoteIngestPath || "/api/v1/logs")
        : String(source.remoteIngestPath || "/api/v1/logs").trim();
    next.remoteSocketPacketIngestPath =
      void 0 === source.remoteSocketPacketIngestPath
        ? String(next.remoteSocketPacketIngestPath || "/api/v1/socket/packets")
        : String(source.remoteSocketPacketIngestPath || "/api/v1/socket/packets").trim();
    next.remoteConfigPath =
      void 0 === source.remoteConfigPath
        ? String(next.remoteConfigPath || "/api/v1/config/latest")
        : String(source.remoteConfigPath || "/api/v1/config/latest").trim();
    next.remoteClientId =
      void 0 === source.remoteClientId
        ? String(next.remoteClientId || "default")
        : String(source.remoteClientId || "default").trim();
    next.remoteApiKey =
      void 0 === source.remoteApiKey
        ? String(next.remoteApiKey || "")
        : String(source.remoteApiKey || "").trim();
    next.remoteFlushIntervalMs = Math.max(
      toInt(source.remoteFlushIntervalMs, next.remoteFlushIntervalMs),
      500
    );
    next.remoteLoggingBatchSize = Math.max(
      toInt(source.remoteLoggingBatchSize, next.remoteLoggingBatchSize),
      1
    );
    next.remoteQueueMax = Math.max(toInt(source.remoteQueueMax, next.remoteQueueMax), 10);
    next.remoteConfigRefreshMs = Math.max(
      toInt(source.remoteConfigRefreshMs, next.remoteConfigRefreshMs),
      5000
    );
    next.dynamicTargeting =
      void 0 === source.dynamicTargeting ? !!next.dynamicTargeting : false !== source.dynamicTargeting;
    next.stopLossRatio = clamp(toNumber(source.stopLossRatio, next.stopLossRatio), 0.001, 0.9);
    next.stopLossAmount =
      void 0 === source.stopLossAmount
        ? void 0 === next.stopLossAmount
          ? void 0
          : Math.max(toNumber(next.stopLossAmount, 0), 0)
        : Math.max(normalizeExternalMoneyToRaw(source.stopLossAmount), 0);
    next.takeProfitRatio = clamp(toNumber(source.takeProfitRatio, next.takeProfitRatio), 0, 3);
    next.takeProfitAmount =
      void 0 === source.takeProfitAmount
        ? void 0 === next.takeProfitAmount
          ? void 0
          : Math.max(toNumber(next.takeProfitAmount, 0), 0)
        : Math.max(normalizeExternalMoneyToRaw(source.takeProfitAmount), 0);
    next.humanLeaveMinDelayMs = Math.max(
      toInt(source.humanLeaveMinDelayMs, next.humanLeaveMinDelayMs),
      500
    );
    next.humanLeaveMaxDelayMs = Math.max(
      toInt(source.humanLeaveMaxDelayMs, next.humanLeaveMaxDelayMs),
      next.humanLeaveMinDelayMs
    );
    next.postLeaveRejoinMinDelayMs = Math.max(
      toInt(source.postLeaveRejoinMinDelayMs, next.postLeaveRejoinMinDelayMs),
      500
    );
    next.postLeaveRejoinMaxDelayMs = Math.max(
      toInt(source.postLeaveRejoinMaxDelayMs, next.postLeaveRejoinMaxDelayMs),
      next.postLeaveRejoinMinDelayMs
    );
    next.fastLeaveRejoinMinDelayMs = Math.max(
      toInt(source.fastLeaveRejoinMinDelayMs, next.fastLeaveRejoinMinDelayMs),
      500
    );
    next.fastLeaveRejoinMaxDelayMs = Math.max(
      toInt(source.fastLeaveRejoinMaxDelayMs, next.fastLeaveRejoinMaxDelayMs),
      next.fastLeaveRejoinMinDelayMs
    );
    next.lossRoomRejoinMinDelayMs = Math.max(
      toInt(source.lossRoomRejoinMinDelayMs, next.lossRoomRejoinMinDelayMs),
      1000
    );
    next.lossRoomRejoinMaxDelayMs = Math.max(
      toInt(source.lossRoomRejoinMaxDelayMs, next.lossRoomRejoinMaxDelayMs),
      next.lossRoomRejoinMinDelayMs
    );
    next.badRoomPauseThreshold = Math.max(
      toInt(source.badRoomPauseThreshold, next.badRoomPauseThreshold),
      1
    );
    next.badRoomPauseMs = Math.max(
      toInt(source.badRoomPauseMs, next.badRoomPauseMs),
      0
    );
    next.badRoomPauseMinResolvedShots = Math.max(
      toInt(source.badRoomPauseMinResolvedShots, next.badRoomPauseMinResolvedShots),
      0
    );
    next.badRoomPauseMinLossRaw = Math.max(
      toNumber(source.badRoomPauseMinLossRaw, next.badRoomPauseMinLossRaw),
      0
    );
    next.defaultMinPaolevel = Math.max(
      toInt(source.defaultMinPaolevel, next.defaultMinPaolevel),
      1
    );
    next.defaultMaxPaolevel = Math.max(
      toInt(source.defaultMaxPaolevel, next.defaultMaxPaolevel),
      next.defaultMinPaolevel
    );
    next.idleKeepaliveEnabled =
      void 0 === source.idleKeepaliveEnabled
        ? !!next.idleKeepaliveEnabled
        : false !== source.idleKeepaliveEnabled;
    next.idleKeepaliveMinSeconds = Math.max(
      toInt(source.idleKeepaliveMinSeconds, next.idleKeepaliveMinSeconds),
      10
    );
    next.idleKeepaliveMaxSeconds = Math.max(
      toInt(source.idleKeepaliveMaxSeconds, next.idleKeepaliveMaxSeconds),
      next.idleKeepaliveMinSeconds
    );
    next.idleKeepaliveRequireReadySeconds = Math.max(
      toInt(
        source.idleKeepaliveRequireReadySeconds,
        next.idleKeepaliveRequireReadySeconds
      ),
      0
    );
    next.blockedNoBulletLeaveThreshold = Math.max(
      toInt(source.blockedNoBulletLeaveThreshold, next.blockedNoBulletLeaveThreshold),
      1
    );
    next.blockedNoBulletMinStayMs = Math.max(
      toInt(source.blockedNoBulletMinStayMs, next.blockedNoBulletMinStayMs),
      0
    );
    next.maxPendingFireOutcomes = Math.max(
      toInt(source.maxPendingFireOutcomes, next.maxPendingFireOutcomes),
      0
    );
    next.pendingFireOutcomeTimeoutMs = Math.max(
      toInt(source.pendingFireOutcomeTimeoutMs, next.pendingFireOutcomeTimeoutMs),
      800
    );
    next.postHitFollowupWindowMs = Math.max(
      toInt(source.postHitFollowupWindowMs, next.postHitFollowupWindowMs),
      500
    );
    next.postHitFollowupMinWinRaw = Math.max(
      toNumber(source.postHitFollowupMinWinRaw, next.postHitFollowupMinWinRaw),
      0
    );
    next.postHitFollowupMaxShotsPerRoom = Math.max(
      toInt(source.postHitFollowupMaxShotsPerRoom, next.postHitFollowupMaxShotsPerRoom),
      0
    );
    next.postHitFollowupMaxPaolevel = Math.max(
      toInt(source.postHitFollowupMaxPaolevel, next.postHitFollowupMaxPaolevel),
      1
    );
    next.postHitFollowupMinCandidateScore = Math.max(
      toNumber(source.postHitFollowupMinCandidateScore, next.postHitFollowupMinCandidateScore),
      1
    );
    next.postHitFollowupMinHitProbability = Math.max(
      toNumber(
        source.postHitFollowupMinHitProbability,
        next.postHitFollowupMinHitProbability
      ),
      1
    );
    next.postHitFollowupMinStableSeenTicks = Math.max(
      toInt(
        source.postHitFollowupMinStableSeenTicks,
        next.postHitFollowupMinStableSeenTicks
      ),
      1
    );
    next.mediumOddsThreshold = Math.max(
      toNumber(source.mediumOddsThreshold, next.mediumOddsThreshold),
      1
    );
    next.highOddsThreshold = Math.max(
      toNumber(source.highOddsThreshold, next.highOddsThreshold),
      next.mediumOddsThreshold
    );
    next.mediumScoreThreshold = Math.max(
      toNumber(source.mediumScoreThreshold, next.mediumScoreThreshold),
      1
    );
    next.highScoreThreshold = Math.max(
      toNumber(source.highScoreThreshold, next.highScoreThreshold),
      next.mediumScoreThreshold
    );
    next.minCandidateScore = Math.max(
      toNumber(source.minCandidateScore, next.minCandidateScore),
      1
    );
    next.minHitProbability = Math.max(
      toNumber(source.minHitProbability, next.minHitProbability),
      1
    );
    next.minStableSeenTicks = Math.max(
      toInt(source.minStableSeenTicks, next.minStableSeenTicks),
      1
    );
    next.manualFireCooldownMs = Math.max(
      toInt(source.manualFireCooldownMs, next.manualFireCooldownMs),
      100
    );
    next.riskCooldownMs = Math.max(
      toInt(source.riskCooldownMs, next.riskCooldownMs),
      1000
    );
    next.maxConsecutiveMissShots = Math.max(
      toInt(source.maxConsecutiveMissShots, next.maxConsecutiveMissShots),
      3
    );
    next.missStreakLeaveThreshold = Math.max(
      toInt(source.missStreakLeaveThreshold, next.missStreakLeaveThreshold),
      1
    );
    next.precisionBlockedLeaveThreshold = Math.max(
      toInt(source.precisionBlockedLeaveThreshold, next.precisionBlockedLeaveThreshold),
      1
    );
    next.peerRecoveryBypassMinCandidateScore = Math.max(
      toNumber(source.peerRecoveryBypassMinCandidateScore, next.peerRecoveryBypassMinCandidateScore),
      1
    );
    next.peerRecoveryBypassMinHitProbability = Math.max(
      toNumber(source.peerRecoveryBypassMinHitProbability, next.peerRecoveryBypassMinHitProbability),
      1
    );
    next.peerRecoveryBypassMinStableSeenTicks = Math.max(
      toInt(source.peerRecoveryBypassMinStableSeenTicks, next.peerRecoveryBypassMinStableSeenTicks),
      1
    );
    next.peerRecoveryBypassMinWaterScore = Math.max(
      toNumber(source.peerRecoveryBypassMinWaterScore, next.peerRecoveryBypassMinWaterScore),
      1
    );
    next.peerRecoveryBypassMinHighOddRate = clamp(
      toNumber(source.peerRecoveryBypassMinHighOddRate, next.peerRecoveryBypassMinHighOddRate),
      0.1,
      1
    );
    next.peerRecoveryBypassMinHighMechanismRate = clamp(
      toNumber(
        source.peerRecoveryBypassMinHighMechanismRate,
        next.peerRecoveryBypassMinHighMechanismRate
      ),
      0,
      1
    );
    next.postHitMaxRampStepsWithoutHighConfirmed = Math.max(
      toInt(
        source.postHitMaxRampStepsWithoutHighConfirmed,
        next.postHitMaxRampStepsWithoutHighConfirmed
      ),
      0
    );
    next.postHitMaxRampStepsWithHighConfirmed = Math.max(
      toInt(source.postHitMaxRampStepsWithHighConfirmed, next.postHitMaxRampStepsWithHighConfirmed),
      next.postHitMaxRampStepsWithoutHighConfirmed
    );
    next.postHitRampMinProfitRaw = Math.max(
      toNumber(source.postHitRampMinProfitRaw, next.postHitRampMinProfitRaw),
      0
    );
    next.postHitRampMinHitCount = Math.max(
      toInt(source.postHitRampMinHitCount, next.postHitRampMinHitCount),
      1
    );
    next.rampMinResolvedShotsBeforeScaleUp = Math.max(
      toInt(
        source.rampMinResolvedShotsBeforeScaleUp,
        next.rampMinResolvedShotsBeforeScaleUp
      ),
      1
    );
    next.rampMinResolvedHitsBeforeScaleUp = Math.max(
      toInt(
        source.rampMinResolvedHitsBeforeScaleUp,
        next.rampMinResolvedHitsBeforeScaleUp
      ),
      1
    );
    next.rampMinRoomProfitRawBeforeScaleUp = Math.max(
      toNumber(
        source.rampMinRoomProfitRawBeforeScaleUp,
        next.rampMinRoomProfitRawBeforeScaleUp
      ),
      0
    );
    next.rampStrongWaterMinScore = Math.max(
      toNumber(source.rampStrongWaterMinScore, next.rampStrongWaterMinScore),
      1
    );
    next.rampStrongWaterMinPeerNetRatio = clamp(
      toNumber(
        source.rampStrongWaterMinPeerNetRatio,
        next.rampStrongWaterMinPeerNetRatio
      ),
      -1,
      1
    );
    next.precisionBlacklistMinTargetId = Math.max(
      toInt(source.precisionBlacklistMinTargetId, next.precisionBlacklistMinTargetId),
      0
    );
    next.precisionBlacklistMinSymbolId = Math.max(
      toInt(source.precisionBlacklistMinSymbolId, next.precisionBlacklistMinSymbolId),
      0
    );
    next.postHitMaxGivebackRatio = clamp(
      toNumber(source.postHitMaxGivebackRatio, next.postHitMaxGivebackRatio),
      0.02,
      0.95
    );
    next.postHitProfitProtectMinRaw = Math.max(
      toNumber(source.postHitProfitProtectMinRaw, next.postHitProfitProtectMinRaw),
      0
    );
    next.postHitLeaveWhenProfitTurnsNegative =
      void 0 === source.postHitLeaveWhenProfitTurnsNegative
        ? !!next.postHitLeaveWhenProfitTurnsNegative
        : !!source.postHitLeaveWhenProfitTurnsNegative;
    next.maxRoomLossRatio = clamp(
      toNumber(source.maxRoomLossRatio, next.maxRoomLossRatio),
      0,
      0.5
    );
    next.maxRoomLossAmount =
      void 0 === source.maxRoomLossAmount
        ? void 0 === next.maxRoomLossAmount
          ? void 0
          : Math.max(toNumber(next.maxRoomLossAmount, 0), 0)
        : Math.max(normalizeExternalMoneyToRaw(source.maxRoomLossAmount), 0);
    next.aimModeWarmupMs = Math.max(
      toInt(source.aimModeWarmupMs, next.aimModeWarmupMs),
      0
    );
    next.betChangeCooldownMs = Math.max(
      toInt(source.betChangeCooldownMs, next.betChangeCooldownMs),
      800
    );
    next.platformWaterWindowSeconds = Math.max(
      toInt(source.platformWaterWindowSeconds, next.platformWaterWindowSeconds),
      30
    );
    next.platformWaterMaxRecords = Math.max(
      toInt(source.platformWaterMaxRecords, next.platformWaterMaxRecords),
      60
    );
    next.platformWaterMinSamples = Math.max(
      toInt(source.platformWaterMinSamples, next.platformWaterMinSamples),
      12
    );
    next.platformWaterBaselineHitRate = clamp(
      toNumber(source.platformWaterBaselineHitRate, next.platformWaterBaselineHitRate),
      0.02,
      0.95
    );
    next.platformWaterBaselineHighMechanismRate = clamp(
      toNumber(
        source.platformWaterBaselineHighMechanismRate,
        next.platformWaterBaselineHighMechanismRate
      ),
      0.005,
      0.95
    );
    next.platformWaterBigWinOddThreshold = Math.max(
      toNumber(source.platformWaterBigWinOddThreshold, next.platformWaterBigWinOddThreshold),
      1
    );
    next.platformWaterWarmScoreThreshold = Math.max(
      toInt(source.platformWaterWarmScoreThreshold, next.platformWaterWarmScoreThreshold),
      10
    );
    next.platformWaterOpenScoreThreshold = Math.max(
      toInt(source.platformWaterOpenScoreThreshold, next.platformWaterOpenScoreThreshold),
      next.platformWaterWarmScoreThreshold
    );
    next.platformDrainRecentWindowShots = Math.max(
      toInt(source.platformDrainRecentWindowShots, next.platformDrainRecentWindowShots),
      2
    );
    next.platformDrainRecentConsecutiveBlock = Math.max(
      toInt(source.platformDrainRecentConsecutiveBlock, next.platformDrainRecentConsecutiveBlock),
      1
    );
    next.platformDrainRecentCountBlock = Math.max(
      toInt(source.platformDrainRecentCountBlock, next.platformDrainRecentCountBlock),
      1
    );
    next.platformDrainRecentLossCountBlock = Math.max(
      toInt(source.platformDrainRecentLossCountBlock, next.platformDrainRecentLossCountBlock),
      1
    );
    next.platformDrainHardBlockMinRate = clamp(
      toNumber(source.platformDrainHardBlockMinRate, next.platformDrainHardBlockMinRate),
      0,
      1
    );
    next.platformDrainHardBlockMinPeerNetRatio = clamp(
      toNumber(
        source.platformDrainHardBlockMinPeerNetRatio,
        next.platformDrainHardBlockMinPeerNetRatio
      ),
      -1,
      1
    );
    next.platformDirectFireMinWaterScore = Math.max(
      toNumber(source.platformDirectFireMinWaterScore, next.platformDirectFireMinWaterScore),
      1
    );
    next.platformDirectFireMinHighOddRate = clamp(
      toNumber(source.platformDirectFireMinHighOddRate, next.platformDirectFireMinHighOddRate),
      0,
      1
    );
    next.platformDirectFireMinPeerNetRatio = clamp(
      toNumber(source.platformDirectFireMinPeerNetRatio, next.platformDirectFireMinPeerNetRatio),
      -1,
      1
    );
    next.platformDirectFireMaxDrainMechanismRate = clamp(
      toNumber(
        source.platformDirectFireMaxDrainMechanismRate,
        next.platformDirectFireMaxDrainMechanismRate
      ),
      0,
      1
    );
    next.platformDirectFireMaxRoomLossRaw = Math.max(
      toNumber(source.platformDirectFireMaxRoomLossRaw, next.platformDirectFireMaxRoomLossRaw),
      0
    );
    next.combatPeerNetFloor = clamp(
      toNumber(source.combatPeerNetFloor, next.combatPeerNetFloor),
      -1,
      5
    );
    next.combatPeerHitFloorRatio = clamp(
      toNumber(source.combatPeerHitFloorRatio, next.combatPeerHitFloorRatio),
      0.05,
      1
    );
    next.combatWarmingPeerHitFloor = clamp(
      toNumber(source.combatWarmingPeerHitFloor, next.combatWarmingPeerHitFloor),
      0,
      1
    );
    next.combatOpenPeerHitFloor = clamp(
      toNumber(source.combatOpenPeerHitFloor, next.combatOpenPeerHitFloor),
      0,
      1
    );
    next.combatSelfNetFloor = clamp(
      toNumber(source.combatSelfNetFloor, next.combatSelfNetFloor),
      -1,
      5
    );
    next.combatSelfRecoveryMinSamples = Math.max(
      toInt(source.combatSelfRecoveryMinSamples, next.combatSelfRecoveryMinSamples),
      1
    );
    next.peerHotSelfColdBlockEnabled =
      void 0 === source.peerHotSelfColdBlockEnabled
        ? !!next.peerHotSelfColdBlockEnabled
        : false !== source.peerHotSelfColdBlockEnabled;
    next.peerHotSelfColdBlockMinPeerNetRatio = clamp(
      toNumber(source.peerHotSelfColdBlockMinPeerNetRatio, next.peerHotSelfColdBlockMinPeerNetRatio),
      -1,
      5
    );
    next.peerHotSelfColdBlockMaxSelfNetRatio = clamp(
      toNumber(source.peerHotSelfColdBlockMaxSelfNetRatio, next.peerHotSelfColdBlockMaxSelfNetRatio),
      -1,
      5
    );
    next.peerHotSelfColdBlockMaxHighMechanismRate = clamp(
      toNumber(
        source.peerHotSelfColdBlockMaxHighMechanismRate,
        next.peerHotSelfColdBlockMaxHighMechanismRate
      ),
      0,
      1
    );
    next.peerHotSelfColdBlockMinSelfSamples = Math.max(
      toInt(source.peerHotSelfColdBlockMinSelfSamples, next.peerHotSelfColdBlockMinSelfSamples),
      1
    );
    next.allowWarmingEmptyOddsPrecision =
      void 0 === source.allowWarmingEmptyOddsPrecision
        ? !!next.allowWarmingEmptyOddsPrecision
        : false !== source.allowWarmingEmptyOddsPrecision;
    next.warmingEmptyOddsMinCandidateScore = Math.max(
      toNumber(source.warmingEmptyOddsMinCandidateScore, next.warmingEmptyOddsMinCandidateScore),
      1
    );
    next.warmingEmptyOddsMinHitProbability = Math.max(
      toNumber(source.warmingEmptyOddsMinHitProbability, next.warmingEmptyOddsMinHitProbability),
      1
    );
    next.warmingEmptyOddsMinStableSeenTicks = Math.max(
      toInt(source.warmingEmptyOddsMinStableSeenTicks, next.warmingEmptyOddsMinStableSeenTicks),
      1
    );
    next.warmingEmptyOddsMinWaterScore = Math.max(
      toNumber(source.warmingEmptyOddsMinWaterScore, next.warmingEmptyOddsMinWaterScore),
      1
    );
    next.warmingEmptyOddsMinHighOddRate = clamp(
      toNumber(source.warmingEmptyOddsMinHighOddRate, next.warmingEmptyOddsMinHighOddRate),
      0.1,
      1
    );
    next.warmingEmptyOddsMinHighMechanismRate = clamp(
      toNumber(
        source.warmingEmptyOddsMinHighMechanismRate,
        next.warmingEmptyOddsMinHighMechanismRate
      ),
      0,
      1
    );
    next.warmingEmptyOddsMinPeerNetRatio = clamp(
      toNumber(source.warmingEmptyOddsMinPeerNetRatio, next.warmingEmptyOddsMinPeerNetRatio),
      -1,
      5
    );
    next.warmingEmptyOddsMinRoomStaySeconds = Math.max(
      toInt(source.warmingEmptyOddsMinRoomStaySeconds, next.warmingEmptyOddsMinRoomStaySeconds),
      0
    );
    next.warmingEmptyOddsWaitedMinCandidateScore = Math.max(
      toNumber(
        source.warmingEmptyOddsWaitedMinCandidateScore,
        next.warmingEmptyOddsWaitedMinCandidateScore
      ),
      1
    );
    next.warmingEmptyOddsWaitedMinHitProbability = Math.max(
      toNumber(
        source.warmingEmptyOddsWaitedMinHitProbability,
        next.warmingEmptyOddsWaitedMinHitProbability
      ),
      1
    );
    next.warmingEmptyOddsWaitedMinStableSeenTicks = Math.max(
      toInt(
        source.warmingEmptyOddsWaitedMinStableSeenTicks,
        next.warmingEmptyOddsWaitedMinStableSeenTicks
      ),
      1
    );
    next.warmingEmptyOddsWaitedMinWaterScore = Math.max(
      toNumber(
        source.warmingEmptyOddsWaitedMinWaterScore,
        next.warmingEmptyOddsWaitedMinWaterScore
      ),
      1
    );
    next.warmingEmptyOddsWaitedMinHighOddRate = clamp(
      toNumber(
        source.warmingEmptyOddsWaitedMinHighOddRate,
        next.warmingEmptyOddsWaitedMinHighOddRate
      ),
      0.1,
      1
    );
    next.warmingEmptyOddsWaitedMinHighMechanismRate = clamp(
      toNumber(
        source.warmingEmptyOddsWaitedMinHighMechanismRate,
        next.warmingEmptyOddsWaitedMinHighMechanismRate
      ),
      0,
      1
    );
    next.warmingEmptyOddsStrongHotMinCandidateScore = Math.max(
      toNumber(
        source.warmingEmptyOddsStrongHotMinCandidateScore,
        next.warmingEmptyOddsStrongHotMinCandidateScore
      ),
      1
    );
    next.warmingEmptyOddsStrongHotMinHitProbability = Math.max(
      toNumber(
        source.warmingEmptyOddsStrongHotMinHitProbability,
        next.warmingEmptyOddsStrongHotMinHitProbability
      ),
      1
    );
    next.warmingEmptyOddsStrongHotMinStableSeenTicks = Math.max(
      toInt(
        source.warmingEmptyOddsStrongHotMinStableSeenTicks,
        next.warmingEmptyOddsStrongHotMinStableSeenTicks
      ),
      1
    );
    next.warmingEmptyOddsStrongHotMinWaterScore = Math.max(
      toNumber(
        source.warmingEmptyOddsStrongHotMinWaterScore,
        next.warmingEmptyOddsStrongHotMinWaterScore
      ),
      1
    );
    next.warmingEmptyOddsStrongHotMinHighOddRate = clamp(
      toNumber(
        source.warmingEmptyOddsStrongHotMinHighOddRate,
        next.warmingEmptyOddsStrongHotMinHighOddRate
      ),
      0.1,
      1
    );
    next.warmingEmptyOddsStrongHotMinPeerNetRatio = clamp(
      toNumber(
        source.warmingEmptyOddsStrongHotMinPeerNetRatio,
        next.warmingEmptyOddsStrongHotMinPeerNetRatio
      ),
      -1,
      5
    );
    next.warmingEmptyOddsCommitWindowMs = Math.max(
      toInt(source.warmingEmptyOddsCommitWindowMs, next.warmingEmptyOddsCommitWindowMs),
      0
    );
    next.warmingEmptyOddsCommitMinCandidateScore = Math.max(
      toNumber(
        source.warmingEmptyOddsCommitMinCandidateScore,
        next.warmingEmptyOddsCommitMinCandidateScore
      ),
      1
    );
    next.warmingEmptyOddsCommitMinHitProbability = Math.max(
      toNumber(
        source.warmingEmptyOddsCommitMinHitProbability,
        next.warmingEmptyOddsCommitMinHitProbability
      ),
      1
    );
    next.warmingEmptyOddsCommitMinStableSeenTicks = Math.max(
      toInt(
        source.warmingEmptyOddsCommitMinStableSeenTicks,
        next.warmingEmptyOddsCommitMinStableSeenTicks
      ),
      1
    );
    next.warmingEmptyOddsCommitMinWaterScore = Math.max(
      toNumber(source.warmingEmptyOddsCommitMinWaterScore, next.warmingEmptyOddsCommitMinWaterScore),
      1
    );
    next.warmingEmptyOddsCommitMinHighOddRate = clamp(
      toNumber(source.warmingEmptyOddsCommitMinHighOddRate, next.warmingEmptyOddsCommitMinHighOddRate),
      0.1,
      1
    );
    next.warmingEmptyOddsCommitMinHighMechanismRate = clamp(
      toNumber(
        source.warmingEmptyOddsCommitMinHighMechanismRate,
        next.warmingEmptyOddsCommitMinHighMechanismRate
      ),
      0,
      1
    );
    next.warmingEmptyOddsMaxShotsPerRoom = Math.max(
      toInt(source.warmingEmptyOddsMaxShotsPerRoom, next.warmingEmptyOddsMaxShotsPerRoom),
      0
    );
    next.monitorOnly =
      void 0 === source.monitorOnly ? !!next.monitorOnly : !!source.monitorOnly;
    next.autoJoin = void 0 === source.autoJoin ? !!next.autoJoin : false !== source.autoJoin;
    next.bootstrapOnLoad =
      void 0 === source.bootstrapOnLoad
    next.precisionPrimaryTargetIds = Array.isArray(source.precisionPrimaryTargetIds)
      ? source.precisionPrimaryTargetIds.map(function (item) {
          return Number(item || 0) || 0;
        }).filter(Boolean)
      : cloneArray(next.precisionPrimaryTargetIds);
    next.precisionSecondaryTargetIds = Array.isArray(source.precisionSecondaryTargetIds)
      ? source.precisionSecondaryTargetIds.map(function (item) {
          return Number(item || 0) || 0;
        }).filter(Boolean)
      : cloneArray(next.precisionSecondaryTargetIds);
    next.precisionBlacklistTargetIds = Array.isArray(source.precisionBlacklistTargetIds)
      ? source.precisionBlacklistTargetIds.map(function (item) {
          return Number(item || 0) || 0;
        }).filter(Boolean)
      : cloneArray(next.precisionBlacklistTargetIds);
    next.precisionBlacklistSymbolIds = Array.isArray(source.precisionBlacklistSymbolIds)
      ? source.precisionBlacklistSymbolIds.map(function (item) {
          return Number(item || 0) || 0;
        }).filter(Boolean)
      : cloneArray(next.precisionBlacklistSymbolIds);
    next.precisionBlacklistOdds = Array.isArray(source.precisionBlacklistOdds)
      ? source.precisionBlacklistOdds.map(function (item) {
          return Number(item || 0) || 0;
        }).filter(function (item) {
          return item >= 0;
        })
      : cloneArray(next.precisionBlacklistOdds);
    next.hotObservationTargetIds = Array.isArray(source.hotObservationTargetIds)
      ? source.hotObservationTargetIds.map(function (item) {
          return Number(item || 0) || 0;
        }).filter(Boolean)
      : cloneArray(next.hotObservationTargetIds);
    next.warmObservationTargetIds = Array.isArray(source.warmObservationTargetIds)
      ? source.warmObservationTargetIds.map(function (item) {
          return Number(item || 0) || 0;
        }).filter(Boolean)
      : cloneArray(next.warmObservationTargetIds);
    next.hotObservationHourSlots = Array.isArray(source.hotObservationHourSlots)
      ? source.hotObservationHourSlots.map(function (item) {
          return String(item || "").trim();
        }).filter(Boolean)
      : cloneArray(next.hotObservationHourSlots);
    next.warmObservationHourSlots = Array.isArray(source.warmObservationHourSlots)
      ? source.warmObservationHourSlots.map(function (item) {
          return String(item || "").trim();
        }).filter(Boolean)
      : cloneArray(next.warmObservationHourSlots);
    next.hotObservationTargetScoreBonus = Math.max(
      toNumber(source.hotObservationTargetScoreBonus, next.hotObservationTargetScoreBonus),
      0
    );
    next.warmObservationTargetScoreBonus = Math.max(
      toNumber(source.warmObservationTargetScoreBonus, next.warmObservationTargetScoreBonus),
      0
    );
    next.hotObservationHourScoreBonus = Math.max(
      toNumber(source.hotObservationHourScoreBonus, next.hotObservationHourScoreBonus),
      0
    );
    next.warmObservationHourScoreBonus = Math.max(
      toNumber(source.warmObservationHourScoreBonus, next.warmObservationHourScoreBonus),
      0
    );
    next.adaptiveBlacklistEnabled =
      void 0 === source.adaptiveBlacklistEnabled
        ? !!next.adaptiveBlacklistEnabled
        : false !== source.adaptiveBlacklistEnabled;
    next.adaptiveBlacklistTargetMinSamples = Math.max(
      toInt(source.adaptiveBlacklistTargetMinSamples, next.adaptiveBlacklistTargetMinSamples),
      1
    );
    next.adaptiveBlacklistTargetMaxRtpRatio = clamp(
      toNumber(source.adaptiveBlacklistTargetMaxRtpRatio, next.adaptiveBlacklistTargetMaxRtpRatio),
      0,
      1
    );
    next.adaptiveBlacklistOddMinSamples = Math.max(
      toInt(source.adaptiveBlacklistOddMinSamples, next.adaptiveBlacklistOddMinSamples),
      1
    );
    next.adaptiveBlacklistOddMaxRtpRatio = clamp(
      toNumber(source.adaptiveBlacklistOddMaxRtpRatio, next.adaptiveBlacklistOddMaxRtpRatio),
      0,
      1
    );
    next.precisionBlacklistNameKeywords = Array.isArray(source.precisionBlacklistNameKeywords)
      ? source.precisionBlacklistNameKeywords.map(function (item) {
          return String(item || "").trim();
        }).filter(Boolean)
      : cloneArray(next.precisionBlacklistNameKeywords);
    next.specialEventFishKinds = Array.isArray(source.specialEventFishKinds)
      ? source.specialEventFishKinds.map(function (item) {
          return Number(item || 0) || 0;
        }).filter(Boolean)
      : cloneArray(next.specialEventFishKinds);
    next.specialEventTargetIds = Array.isArray(source.specialEventTargetIds)
      ? source.specialEventTargetIds.map(function (item) {
          return Number(item || 0) || 0;
        }).filter(Boolean)
      : cloneArray(next.specialEventTargetIds);
    next.specialEventSymbolIds = Array.isArray(source.specialEventSymbolIds)
      ? source.specialEventSymbolIds.map(function (item) {
          return Number(item || 0) || 0;
        }).filter(Boolean)
      : cloneArray(next.specialEventSymbolIds);
    next.specialEventNameKeywords = Array.isArray(source.specialEventNameKeywords)
      ? source.specialEventNameKeywords.map(function (item) {
          return String(item || "").trim();
        }).filter(Boolean)
      : cloneArray(next.specialEventNameKeywords);
    next.specialEventScoreBonus = Math.max(
      toNumber(source.specialEventScoreBonus, next.specialEventScoreBonus),
      0
    );
    next.specialEventHitProbabilityBonus = Math.max(
      toNumber(source.specialEventHitProbabilityBonus, next.specialEventHitProbabilityBonus),
      0
    );
    next.specialEventStableSeenTicksRelax = Math.max(
      toInt(source.specialEventStableSeenTicksRelax, next.specialEventStableSeenTicksRelax),
      0
    );
    next.specialEventWaterScoreRelax = Math.max(
      toNumber(source.specialEventWaterScoreRelax, next.specialEventWaterScoreRelax),
      0
    );
    next.specialEventHighOddRateRelax = clamp(
      toNumber(source.specialEventHighOddRateRelax, next.specialEventHighOddRateRelax),
      0,
      0.5
    );
    next.specialEventHighMechanismRateRelax = clamp(
      toNumber(source.specialEventHighMechanismRateRelax, next.specialEventHighMechanismRateRelax),
      0,
      0.5
    );
    next.specialEventWindowMinCandidateScore = Math.max(
      toNumber(source.specialEventWindowMinCandidateScore, next.specialEventWindowMinCandidateScore),
      1
    );
    next.specialEventWindowMinHitProbability = Math.max(
      toNumber(source.specialEventWindowMinHitProbability, next.specialEventWindowMinHitProbability),
      1
    );
    next.specialEventWindowMinStableSeenTicks = Math.max(
      toInt(source.specialEventWindowMinStableSeenTicks, next.specialEventWindowMinStableSeenTicks),
      1
    );
    next.specialEventWindowMinWaterScore = Math.max(
      toNumber(source.specialEventWindowMinWaterScore, next.specialEventWindowMinWaterScore),
      1
    );
    next.specialEventWindowMinHighMechanismRate = clamp(
      toNumber(
        source.specialEventWindowMinHighMechanismRate,
        next.specialEventWindowMinHighMechanismRate
      ),
      0,
      1
    );
    next.specialEventWindowMinOpenFeatureRate = clamp(
      toNumber(
        source.specialEventWindowMinOpenFeatureRate,
        next.specialEventWindowMinOpenFeatureRate
      ),
      0,
      1
    );
    next.specialEventWindowMinOpenFeatureHitRate = clamp(
      toNumber(
        source.specialEventWindowMinOpenFeatureHitRate,
        next.specialEventWindowMinOpenFeatureHitRate
      ),
      0,
      1
    );
    next.strictWhitelistWhenOddsEmpty =
      void 0 === source.strictWhitelistWhenOddsEmpty
        ? !!next.strictWhitelistWhenOddsEmpty
        : false !== source.strictWhitelistWhenOddsEmpty;
    next.recheckBeforeFire =
      void 0 === source.recheckBeforeFire
        ? !!next.recheckBeforeFire
        : false !== source.recheckBeforeFire;
    next.autoDismissBattleGuide =
      void 0 === source.autoDismissBattleGuide
        ? !!next.autoDismissBattleGuide
        : false !== source.autoDismissBattleGuide;
    next.battleGuideDismissCooldownMs = Math.max(
      toInt(source.battleGuideDismissCooldownMs, next.battleGuideDismissCooldownMs),
      200
    );
    next.battleGuideDismissMaxAttemptsPerRoom = Math.max(
      toInt(
        source.battleGuideDismissMaxAttemptsPerRoom,
        next.battleGuideDismissMaxAttemptsPerRoom
      ),
      1
    );
    next.allowBootstrapJoinWhenUnknown =
      void 0 === source.allowBootstrapJoinWhenUnknown
        ? !!next.allowBootstrapJoinWhenUnknown
        : false !== source.allowBootstrapJoinWhenUnknown;
    next.allowProbeFire =
      void 0 === source.allowProbeFire ? !!next.allowProbeFire : false !== source.allowProbeFire;
    next.probeAfterObserveSeconds = Math.max(
      toInt(source.probeAfterObserveSeconds, next.probeAfterObserveSeconds),
      0
    );
    next.probeCandidateScoreThreshold = Math.max(
      toNumber(source.probeCandidateScoreThreshold, next.probeCandidateScoreThreshold),
      1
    );
    next.probeHitProbabilityThreshold = Math.max(
      toNumber(source.probeHitProbabilityThreshold, next.probeHitProbabilityThreshold),
      1
    );
    next.allowWarmingNeutralProbe =
      void 0 === source.allowWarmingNeutralProbe
        ? !!next.allowWarmingNeutralProbe
        : false !== source.allowWarmingNeutralProbe;
    next.warmingNeutralProbeMinCandidateScore = Math.max(
      toNumber(
        source.warmingNeutralProbeMinCandidateScore,
        next.warmingNeutralProbeMinCandidateScore
      ),
      1
    );
    next.warmingNeutralProbeMinHitProbability = Math.max(
      toNumber(
        source.warmingNeutralProbeMinHitProbability,
        next.warmingNeutralProbeMinHitProbability
      ),
      1
    );
    next.warmingNeutralProbeMinStableSeenTicks = Math.max(
      toInt(
        source.warmingNeutralProbeMinStableSeenTicks,
        next.warmingNeutralProbeMinStableSeenTicks
      ),
      1
    );
    next.warmingNeutralProbeMinWaterScore = Math.max(
      toNumber(source.warmingNeutralProbeMinWaterScore, next.warmingNeutralProbeMinWaterScore),
      1
    );
    next.warmingNeutralProbeMinHighOddRate = clamp(
      toNumber(source.warmingNeutralProbeMinHighOddRate, next.warmingNeutralProbeMinHighOddRate),
      0.1,
      1
    );
    next.warmingNeutralProbeMinPeerNetRatio = clamp(
      toNumber(
        source.warmingNeutralProbeMinPeerNetRatio,
        next.warmingNeutralProbeMinPeerNetRatio
      ),
      -1,
      5
    );
    next.warmingNeutralProbeMinHighMechanismRate = clamp(
      toNumber(
        source.warmingNeutralProbeMinHighMechanismRate,
        next.warmingNeutralProbeMinHighMechanismRate
      ),
      0,
      1
    );
    next.warmingNeutralProbeFallbackWaterScore = Math.max(
      toNumber(
        source.warmingNeutralProbeFallbackWaterScore,
        next.warmingNeutralProbeFallbackWaterScore
      ),
      1
    );
    next.warmingNeutralProbeFallbackPeerNetRatio = clamp(
      toNumber(
        source.warmingNeutralProbeFallbackPeerNetRatio,
        next.warmingNeutralProbeFallbackPeerNetRatio
      ),
      -1,
      5
    );
    next.warmingNeutralProbeFallbackHighOddRate = clamp(
      toNumber(
        source.warmingNeutralProbeFallbackHighOddRate,
        next.warmingNeutralProbeFallbackHighOddRate
      ),
      0.1,
      1
    );
    next.warmingNeutralProbeMinDistanceOpenFireScore = Math.max(
      toNumber(
        source.warmingNeutralProbeMinDistanceOpenFireScore,
        next.warmingNeutralProbeMinDistanceOpenFireScore
      ),
      0
    );
    next.allowColdRoomValidationProbe =
      void 0 === source.allowColdRoomValidationProbe
        ? !!next.allowColdRoomValidationProbe
        : false !== source.allowColdRoomValidationProbe;
    next.coldRoomValidationObserveSeconds = Math.max(
      toInt(
        source.coldRoomValidationObserveSeconds,
        next.coldRoomValidationObserveSeconds
      ),
      12
    );
    next.coldRoomValidationMinSamples = Math.max(
      toInt(source.coldRoomValidationMinSamples, next.coldRoomValidationMinSamples),
      60
    );
    next.coldRoomValidationMinCandidateScore = Math.max(
      toNumber(
        source.coldRoomValidationMinCandidateScore,
        next.coldRoomValidationMinCandidateScore
      ),
      70
    );
    next.coldRoomValidationMinHitProbability = Math.max(
      toNumber(
        source.coldRoomValidationMinHitProbability,
        next.coldRoomValidationMinHitProbability
      ),
      90
    );
    next.coldRoomValidationMinStableSeenTicks = Math.max(
      toInt(
        source.coldRoomValidationMinStableSeenTicks,
        next.coldRoomValidationMinStableSeenTicks
      ),
      5
    );
    next.coldRoomValidationMinWaterScore = Math.max(
      toNumber(
        source.coldRoomValidationMinWaterScore,
        next.coldRoomValidationMinWaterScore
      ),
      1
    );
    next.coldRoomValidationMinPeerNetRatio = clamp(
      toNumber(
        source.coldRoomValidationMinPeerNetRatio,
        next.coldRoomValidationMinPeerNetRatio
      ),
      -1,
      1
    );
    next.coldRoomValidationMinHighOddRate = clamp(
      toNumber(
        source.coldRoomValidationMinHighOddRate,
        next.coldRoomValidationMinHighOddRate
      ),
      0,
      1
    );
    next.coldRoomFollowupEnabled =
      void 0 === source.coldRoomFollowupEnabled
        ? !!next.coldRoomFollowupEnabled
        : false !== source.coldRoomFollowupEnabled;
    next.coldRoomFollowupWindowSeconds = Math.max(
      toInt(source.coldRoomFollowupWindowSeconds, next.coldRoomFollowupWindowSeconds),
      3
    );
    next.coldRoomFollowupMaxShots = Math.max(
      toInt(source.coldRoomFollowupMaxShots, next.coldRoomFollowupMaxShots),
      1
    );
    next.coldRoomFollowupMinCandidateScore = Math.max(
      toNumber(
        source.coldRoomFollowupMinCandidateScore,
        next.coldRoomFollowupMinCandidateScore
      ),
      60
    );
    next.coldRoomFollowupMinHitProbability = Math.max(
      toNumber(
        source.coldRoomFollowupMinHitProbability,
        next.coldRoomFollowupMinHitProbability
      ),
      70
    );
    next.coldRoomFollowupMinStableSeenTicks = Math.max(
      toInt(
        source.coldRoomFollowupMinStableSeenTicks,
        next.coldRoomFollowupMinStableSeenTicks
      ),
      1
    );
    next.allowEmptyOddsProbeForNeutral =
      void 0 === source.allowEmptyOddsProbeForNeutral
        ? !!next.allowEmptyOddsProbeForNeutral
        : false !== source.allowEmptyOddsProbeForNeutral;
    next.emptyOddsProbeMinCandidateScore = Math.max(
      toNumber(source.emptyOddsProbeMinCandidateScore, next.emptyOddsProbeMinCandidateScore),
      92
    );
    next.emptyOddsProbeMinHitProbability = Math.max(
      toNumber(source.emptyOddsProbeMinHitProbability, next.emptyOddsProbeMinHitProbability),
      90
    );
    next.emptyOddsProbeMinStableSeenTicks = Math.max(
      toInt(source.emptyOddsProbeMinStableSeenTicks, next.emptyOddsProbeMinStableSeenTicks),
      4
    );
    next.emptyOddsProbeMinDistanceOpenFireScore = Math.max(
      toNumber(
        source.emptyOddsProbeMinDistanceOpenFireScore,
        next.emptyOddsProbeMinDistanceOpenFireScore
      ),
      40
    );
    next.probeCandidateScoreThreshold = Math.max(
      toNumber(source.probeCandidateScoreThreshold, next.probeCandidateScoreThreshold),
      60
    );
    next.probeHitProbabilityThreshold = Math.max(
      toNumber(source.probeHitProbabilityThreshold, next.probeHitProbabilityThreshold),
      82
    );
    next.weakSignalNeutralThreshold = Math.max(
      toInt(source.weakSignalNeutralThreshold, next.weakSignalNeutralThreshold),
      1
    );
    next.weakSignalMinHitProbability = Math.max(
      toNumber(source.weakSignalMinHitProbability, next.weakSignalMinHitProbability),
      1
    );
    next.weakSignalMinStableSeenTicks = Math.max(
      toInt(source.weakSignalMinStableSeenTicks, next.weakSignalMinStableSeenTicks),
      1
    );
    next.weakSignalMinRoomStaySeconds = Math.max(
      toInt(source.weakSignalMinRoomStaySeconds, next.weakSignalMinRoomStaySeconds),
      0
    );
    next.blockedRoomLeaveSeconds = Math.max(
      toInt(source.blockedRoomLeaveSeconds, next.blockedRoomLeaveSeconds),
      0
    );
    next.blockedRoomLeaveMinRoomStaySeconds = Math.max(
      toInt(source.blockedRoomLeaveMinRoomStaySeconds, next.blockedRoomLeaveMinRoomStaySeconds),
      0
    );
    next.blockedRoomLeaveWarmingMinScore = Math.max(
      toNumber(source.blockedRoomLeaveWarmingMinScore, next.blockedRoomLeaveWarmingMinScore),
      1
    );
    next.blockedRoomLeaveWarmingExtraSeconds = Math.max(
      toInt(
        source.blockedRoomLeaveWarmingExtraSeconds,
        next.blockedRoomLeaveWarmingExtraSeconds
      ),
      0
    );
    next.blockedRoomLeaveReasons = Array.isArray(source.blockedRoomLeaveReasons)
      ? source.blockedRoomLeaveReasons.map(function (item) {
          return String(item || "").trim();
        }).filter(Boolean)
      : cloneArray(next.blockedRoomLeaveReasons);
    next.preferredRooms = normalizePreferredRooms(source.preferredRooms || next.preferredRooms);
    next.targetFishIds = Array.isArray(source.targetFishIds)
      ? source.targetFishIds.map(function (item) {
          return Number(item || 0) || 0;
        }).filter(Boolean)
      : cloneArray(next.targetFishIds);
    var roomPaolevelConfig = pickObject(source.roomPaolevelConfig);
    if (Object.keys(roomPaolevelConfig).length) {
      next.roomPaolevelConfig = roomPaolevelConfig;
    } else {
      next.roomPaolevelConfig = {
        small: {
          min: Math.max(toInt(next.defaultMinPaolevel, 1), 1),
          max: Math.max(toInt(next.defaultMaxPaolevel, 3), Math.max(toInt(next.defaultMinPaolevel, 1), 1)),
        },
        middle: {
          min: Math.max(toInt(next.defaultMinPaolevel, 1), 1),
          max: Math.max(Math.min(toInt(next.defaultMaxPaolevel, 2), 2), Math.max(toInt(next.defaultMinPaolevel, 1), 1)),
        },
        large: {
          min: Math.max(toInt(next.defaultMinPaolevel, 1), 1),
          max: Math.max(Math.min(toInt(next.defaultMaxPaolevel, 3), 3), Math.max(toInt(next.defaultMinPaolevel, 1), 1)),
        },
      };
    }
    return applyBuiltInRemoteServiceSwitch(next);
  }

  function jsonCloneSafe(value, fallback) {
    var nextFallback = void 0 === fallback ? null : fallback;
    if (void 0 === value) {
      return nextFallback;
    }
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return nextFallback;
    }
  }

  function buildRuntimeSessionId() {
    return (
      "sess_" +
      String(Date.now()) +
      "_" +
      Math.random()
        .toString(36)
        .slice(2, 10)
    );
  }

  function canUseRemoteService(config) {
    return (
      ("function" == typeof fetch || "function" == typeof XMLHttpRequest) &&
      !!String(config && config.remoteServiceBaseUrl ? config.remoteServiceBaseUrl : "").trim()
    );
  }

  function sendRemoteRequest(url, options) {
    var requestUrl = String(url || "").trim();
    var requestOptions = pickObject(options);
    if ("function" == typeof fetch) {
      return fetch(requestUrl, requestOptions);
    }
    if ("function" == typeof XMLHttpRequest) {
      return new Promise(function (resolve, reject) {
        try {
          var xhr = new XMLHttpRequest();
          xhr.open(String(requestOptions.method || "GET"), requestUrl, true);
          var headers = pickObject(requestOptions.headers);
          var headerKey = "";
          for (headerKey in headers) {
            xhr.setRequestHeader(headerKey, String(headers[headerKey]));
          }
          xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
              return;
            }
            resolve({
              ok: xhr.status >= 200 && xhr.status < 300,
              status: Number(xhr.status || 0) || 0,
              json: function () {
                return new Promise(function (resolveJson, rejectJson) {
                  try {
                    resolveJson(xhr.responseText ? JSON.parse(xhr.responseText) : {});
                  } catch (err) {
                    rejectJson(err);
                  }
                });
              },
            });
          };
          xhr.onerror = function () {
            reject(new Error("xhr_network_error"));
          };
          xhr.send(void 0 === requestOptions.body ? null : requestOptions.body);
        } catch (err) {
          reject(err);
        }
      });
    }
    return Promise.reject(new Error("remote_transport_unavailable"));
  }

  function buildRemoteServiceUrl(config, path) {
    var base = String(config && config.remoteServiceBaseUrl ? config.remoteServiceBaseUrl : "").trim();
    if (!base) {
      return "";
    }
    var nextPath = String(path || "").trim();
    if (!nextPath) {
      return base;
    }
    if (/^https?:\/\//i.test(nextPath)) {
      return nextPath;
    }
    return base.replace(/\/+$/, "") + "/" + nextPath.replace(/^\/+/, "");
  }

  function buildRemoteHeaders(config) {
    var headers = {
      "Content-Type": "application/json",
    };
    var apiKey = String(config && config.remoteApiKey ? config.remoteApiKey : "").trim();
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }
    return headers;
  }

  function trimRemoteLogQueue() {
    if (!Array.isArray(runtimeState.remoteLogQueue)) {
      runtimeState.remoteLogQueue = [];
      return;
    }
    var maxSize = Math.max(toInt(runtimeState.config && runtimeState.config.remoteQueueMax, 200), 10);
    if (runtimeState.remoteLogQueue.length <= maxSize) {
      return;
    }
    runtimeState.remoteLogQueue = runtimeState.remoteLogQueue.slice(
      runtimeState.remoteLogQueue.length - maxSize
    );
  }

  function syncPanelAfterRemoteUpdate() {
    if (!runtimeState || !runtimeState.panel || !runtimeState.panel.mounted) {
      return;
    }
    try {
      syncPanelInputs();
      syncPanelStatus();
    } catch (err) {}
  }

  function enqueueRemoteLog(kind, level, text, payload) {
    if (
      !runtimeState ||
      !runtimeState.config ||
      !runtimeState.config.remoteLoggingEnabled ||
      !canUseRemoteService(runtimeState.config)
    ) {
      return;
    }
    if (!Array.isArray(runtimeState.remoteLogQueue)) {
      runtimeState.remoteLogQueue = [];
    }
    if (!runtimeState.remoteSessionId) {
      runtimeState.remoteSessionId = buildRuntimeSessionId();
    }
    runtimeState.remoteLogQueue.push({
      kind: String(kind || "LOG"),
      tag: String(kind || "LOG"),
      level: String(level || "log"),
      text: String(text || ""),
      ts: Date.now(),
      payload: jsonCloneSafe(payload, null),
    });
    trimRemoteLogQueue();
    if (
      runtimeState.remoteLogQueue.length >=
      Math.max(toInt(runtimeState.config.remoteLoggingBatchSize, 10), 1)
    ) {
      flushRemoteLogQueue(true);
      return;
    }
    flushRemoteLogQueue(false);
  }

  function flushRemoteLogQueue(force) {
    if (
      !runtimeState ||
      !runtimeState.config ||
      !runtimeState.config.remoteLoggingEnabled ||
      !canUseRemoteService(runtimeState.config) ||
      !Array.isArray(runtimeState.remoteLogQueue) ||
      !runtimeState.remoteLogQueue.length ||
      runtimeState.remoteLogFlushInFlight
    ) {
      return;
    }
    var now = Date.now();
    var intervalMs = Math.max(toInt(runtimeState.config.remoteFlushIntervalMs, 5000), 500);
    if (!force && now - Number(runtimeState.remoteLastFlushAt || 0) < intervalMs) {
      return;
    }
    var batchSize = Math.max(toInt(runtimeState.config.remoteLoggingBatchSize, 10), 1);
    var entries = runtimeState.remoteLogQueue.slice(0, batchSize);
    var endpoint = buildRemoteServiceUrl(
      runtimeState.config,
      runtimeState.config.remoteIngestPath || "/api/v1/logs"
    );
    if (!endpoint) {
      return;
    }
    runtimeState.remoteLogFlushInFlight = true;
    sendRemoteRequest(endpoint, {
      method: "POST",
      headers: buildRemoteHeaders(runtimeState.config),
      body: JSON.stringify({
        clientId: String(runtimeState.config.remoteClientId || "default"),
        sessionId: String(runtimeState.remoteSessionId || buildRuntimeSessionId()),
        version: getRuntimeScriptVersion(),
        entries: entries,
      }),
    })
      .then(function (response) {
        runtimeState.remoteLastHttpStatus = Number(response && response.status ? response.status : 0) || 0;
        if (!response || !response.ok) {
          throw new Error("remote_log_http_" + String(response ? response.status : 0));
        }
        return response.json().catch(function () {
          return {};
        });
      })
      .then(function () {
        runtimeState.remoteLogQueue.splice(0, entries.length);
        runtimeState.remoteLastSuccessAt = Date.now();
        runtimeState.remoteLastError = "";
        runtimeState.remoteLastErrorAt = 0;
      })
      .catch(function (err) {
        runtimeState.remoteLastError = err && err.message ? String(err.message) : String(err || "remote_log_failed");
        runtimeState.remoteLastErrorAt = Date.now();
        emitConsoleLog(
          "warn",
          "REMOTE",
          "远端日志上报失败: " + runtimeState.remoteLastError,
          {
            endpoint: endpoint,
            clientId: String(runtimeState.config.remoteClientId || "default"),
            queueLength: Array.isArray(runtimeState.remoteLogQueue) ? runtimeState.remoteLogQueue.length : 0,
            status: Number(runtimeState.remoteLastHttpStatus || 0) || 0,
          }
        );
      })
      .finally(function () {
        runtimeState.remoteLastFlushAt = Date.now();
        runtimeState.remoteLogFlushInFlight = false;
        if (runtimeState.remoteLogQueue.length >= batchSize) {
          setTimeout(function () {
            flushRemoteLogQueue(false);
          }, 120);
        }
      });
  }

  function trimRemoteSocketPacketQueue() {
    if (!Array.isArray(runtimeState.remoteSocketPacketQueue)) {
      runtimeState.remoteSocketPacketQueue = [];
      return;
    }
    var maxSize = Math.max(
      toInt(runtimeState.config && runtimeState.config.remoteQueueMax, 200),
      10
    );
    if (runtimeState.remoteSocketPacketQueue.length <= maxSize) {
      return;
    }
    runtimeState.remoteSocketPacketQueue = runtimeState.remoteSocketPacketQueue.slice(
      runtimeState.remoteSocketPacketQueue.length - maxSize
    );
  }

  function encodeSocketPacketBytesToBase64(bytes) {
    var index = 0;
    var chunkSize = 32768;
    var parts = [];
    if (!bytes || !bytes.length || "function" != typeof btoa) {
      return "";
    }
    for (index = 0; index < bytes.length; index += chunkSize) {
      parts.push(
        String.fromCharCode.apply(
          null,
          Array.prototype.slice.call(bytes.subarray(index, Math.min(index + chunkSize, bytes.length)))
        )
      );
    }
    return btoa(parts.join(""));
  }

  function normalizeRuntimeSocketRawPayload(raw) {
    var bytes = null;
    if ("undefined" != typeof Blob && raw instanceof Blob) {
      return raw.arrayBuffer().then(function (buffer) {
        return normalizeRuntimeSocketRawPayload(buffer);
      });
    }
    if ("string" == typeof raw) {
      var text = String(raw || "");
      var jsonValue = null;
      try {
        jsonValue = JSON.parse(text);
      } catch (err) {}
      return Promise.resolve({
        type: "text",
        text: text,
        json: jsonCloneSafe(jsonValue, null),
      });
    }
    bytes =
      raw instanceof Uint8Array
        ? raw
        : raw instanceof ArrayBuffer
          ? new Uint8Array(raw)
          : raw && raw.buffer instanceof ArrayBuffer
            ? new Uint8Array(raw.buffer, raw.byteOffset || 0, raw.byteLength || 0)
            : null;
    if (bytes) {
      return Promise.resolve({
        type: "binary",
        encoding: "base64",
        byteLength: Number(bytes.byteLength || bytes.length || 0) || 0,
        data: encodeSocketPacketBytesToBase64(bytes),
      });
    }
    return Promise.resolve({
      type: "snapshot",
      value: jsonCloneSafe(raw, String(raw || "")),
    });
  }

  function buildRuntimeSocketHookId() {
    return (
      "sock_" +
      String(Date.now()) +
      "_" +
      Math.random()
        .toString(36)
        .slice(2, 8)
    );
  }

  function buildRemoteSocketPacketSignature(entry) {
    var raw = jsonCloneSafe(entry && entry.raw, null);
    var params = jsonCloneSafe(entry && entry.params, null);
    return [
      String(entry && entry.direction || ""),
      String(entry && entry.socketId || ""),
      String(entry && entry.controller_name || ""),
      String(entry && entry.action_name || ""),
      String(entry && entry.event || ""),
      JSON.stringify(null != raw ? raw : params || {}).slice(0, 256),
    ].join("|");
  }

  function shouldDropDuplicateRemoteSocketPacket(entry) {
    var now = Date.now();
    var key = buildRemoteSocketPacketSignature(entry);
    var cache = pickObject(runtimeState.remoteSocketPacketRecentSignatures);
    var dedupeWindowMs = 1200;
    var expireMs = 4000;
    var name = "";
    for (name in cache) {
      if (now - (Number(cache[name] || 0) || 0) > expireMs) {
        delete cache[name];
      }
    }
    runtimeState.remoteSocketPacketRecentSignatures = cache;
    if ((Number(cache[key] || 0) || 0) > 0 && now - (Number(cache[key] || 0) || 0) <= dedupeWindowMs) {
      return true;
    }
    cache[key] = now;
    return false;
  }

  function archiveRuntimeRawSocketFrame(direction, rawData, context, eventName) {
    var nextContext = pickObject(context);
    normalizeRuntimeSocketRawPayload(rawData)
      .then(function (rawPayload) {
        var parsedParams =
          rawPayload &&
          "text" === rawPayload.type &&
          rawPayload.json &&
          "object" == typeof rawPayload.json
            ? rawPayload.json
            : {};
        enqueueRemoteSocketPacket({
          ts: Number(nextContext.ts || Date.now()) || Date.now(),
          direction: String(direction || ""),
          transport: "websocket",
          socketId: String(nextContext.socketId || ""),
          sourceUrl: String(nextContext.sourceUrl || ""),
          host: String(location && location.host ? location.host : ""),
          controller: null,
          controller_name: "RAW",
          action: null,
          action_name: "RawFrame",
          event: String(eventName || ""),
          params: jsonCloneSafe(parsedParams, {}),
          raw: rawPayload,
          hex: null,
          error: null,
          meta: {
            source: "runtime_socket_hook",
          },
        });
      })
      .catch(function (err) {
        emitConsoleLog(
          "warn",
          "REMOTE",
          "原始 socket 采集失败: " + String(err && err.message ? err.message : err || ""),
          {
            direction: String(direction || ""),
            event: String(eventName || ""),
          }
        );
      });
  }

  function attachRuntimeSocketHooksToInstance(socket, sourceUrl) {
    if (!socket || socket.__AUTO_FISH_RAW_SOCKET_HOOKED__) {
      return false;
    }
    if (!/\/websocket(?:\?|$)/.test(String(sourceUrl || socket.url || ""))) {
      return false;
    }
    socket.__AUTO_FISH_RAW_SOCKET_HOOKED__ = true;
    socket.__AUTO_FISH_RAW_SOCKET_ID__ =
      String(socket.__AUTO_FISH_RAW_SOCKET_ID__ || "") || buildRuntimeSocketHookId();
    if ("function" == typeof socket.send) {
      var nativeSend = socket.send.bind(socket);
      socket.send = function (data) {
        archiveRuntimeRawSocketFrame(
          "c2s",
          data,
          {
            socketId: String(socket.__AUTO_FISH_RAW_SOCKET_ID__ || ""),
            sourceUrl: String(sourceUrl || socket.url || ""),
            ts: Date.now(),
          },
          "raw_send"
        );
        return nativeSend.apply(socket, arguments);
      };
    }
    if ("function" == typeof socket.addEventListener) {
      socket.addEventListener("message", function (event) {
        archiveRuntimeRawSocketFrame(
          "s2c",
          event && event.data,
          {
            socketId: String(socket.__AUTO_FISH_RAW_SOCKET_ID__ || ""),
            sourceUrl: String(sourceUrl || socket.url || ""),
            ts: Date.now(),
          },
          "raw_message"
        );
      });
    }
    return true;
  }

  function isWebSocketLike(value) {
    if (!value || "object" != typeof value) {
      return false;
    }
    return (
      "function" == typeof value.send &&
      "function" == typeof value.addEventListener &&
      ("string" == typeof value.url || "function" == typeof value.close)
    );
  }

  function findExistingSocketInObject(root, maxDepth) {
    var seen = [];
    var queue = [{ value: root, depth: 0 }];
    while (queue.length) {
      var current = queue.shift();
      var value = current && current.value;
      var depth = Number(current && current.depth || 0) || 0;
      var keys = [];
      var i = 0;
      var key = "";
      if (!value || "object" != typeof value) {
        continue;
      }
      if (seen.indexOf(value) >= 0) {
        continue;
      }
      seen.push(value);
      if (isWebSocketLike(value)) {
        return value;
      }
      if (depth >= maxDepth) {
        continue;
      }
      try {
        keys = Object.keys(value);
      } catch (err) {
        keys = [];
      }
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (!key || "__proto__" === key || "prototype" === key) {
          continue;
        }
        try {
          if (value[key] && "object" == typeof value[key]) {
            queue.push({
              value: value[key],
              depth: depth + 1,
            });
          }
        } catch (err) {}
      }
    }
    return null;
  }

  function attachExistingSmartFoxSocketHooks() {
    var sfs = getSmartFoxInstance();
    var socket = null;
    if (!sfs) {
      return false;
    }
    socket = findExistingSocketInObject(sfs, 5);
    if (!socket) {
      return false;
    }
    runtimeState.runtimeSocketExistingAttached =
      false !== attachRuntimeSocketHooksToInstance(socket, socket.url || "");
    return !!runtimeState.runtimeSocketExistingAttached;
  }

  function ensureRuntimeSocketPacketHooks() {
    var CurrentWebSocket = window.WebSocket;
    if (runtimeState.runtimeSocketHookInstalled) {
      attachExistingSmartFoxSocketHooks();
      return true;
    }
    if ("function" != typeof CurrentWebSocket) {
      return false;
    }
    runtimeState.runtimeSocketOriginalWebSocket = CurrentWebSocket;
    if (CurrentWebSocket.__AUTO_FISH_RAW_SOCKET_WRAPPED__) {
      runtimeState.runtimeSocketHookInstalled = true;
      runtimeState.runtimeSocketWebSocketWrapped = true;
      attachExistingSmartFoxSocketHooks();
      return true;
    }
    function AutoFishWrappedWebSocket(url, protocols) {
      var socket =
        arguments.length > 1
          ? new CurrentWebSocket(url, protocols)
          : new CurrentWebSocket(url);
      try {
        attachRuntimeSocketHooksToInstance(socket, url);
      } catch (err) {}
      return socket;
    }
    AutoFishWrappedWebSocket.prototype = CurrentWebSocket.prototype;
    Object.defineProperties(AutoFishWrappedWebSocket, {
      CONNECTING: { value: CurrentWebSocket.CONNECTING },
      OPEN: { value: CurrentWebSocket.OPEN },
      CLOSING: { value: CurrentWebSocket.CLOSING },
      CLOSED: { value: CurrentWebSocket.CLOSED },
      __AUTO_FISH_RAW_SOCKET_WRAPPED__: { value: true },
    });
    window.WebSocket = AutoFishWrappedWebSocket;
    runtimeState.runtimeSocketHookInstalled = true;
    runtimeState.runtimeSocketWebSocketWrapped = true;
    attachExistingSmartFoxSocketHooks();
    return true;
  }

  function enqueueRemoteSocketPacket(entry) {
    if (
      !runtimeState ||
      !runtimeState.config ||
      !runtimeState.config.remoteLoggingEnabled ||
      !canUseRemoteService(runtimeState.config)
    ) {
      return;
    }
    if (!Array.isArray(runtimeState.remoteSocketPacketQueue)) {
      runtimeState.remoteSocketPacketQueue = [];
    }
    if (!runtimeState.remoteSessionId) {
      runtimeState.remoteSessionId = buildRuntimeSessionId();
    }
    if (shouldDropDuplicateRemoteSocketPacket(entry)) {
      return;
    }
    runtimeState.remoteSocketPacketQueue.push(entry);
    trimRemoteSocketPacketQueue();
    if (
      runtimeState.remoteSocketPacketQueue.length >=
      Math.max(toInt(runtimeState.config.remoteLoggingBatchSize, 10), 1)
    ) {
      flushRemoteSocketPacketQueue(true);
      return;
    }
    flushRemoteSocketPacketQueue(false);
  }

  function flushRemoteSocketPacketQueue(force) {
    if (
      !runtimeState ||
      !runtimeState.config ||
      !runtimeState.config.remoteLoggingEnabled ||
      !canUseRemoteService(runtimeState.config) ||
      !Array.isArray(runtimeState.remoteSocketPacketQueue) ||
      !runtimeState.remoteSocketPacketQueue.length ||
      runtimeState.remoteSocketPacketFlushInFlight
    ) {
      return;
    }
    var now = Date.now();
    var intervalMs = Math.max(toInt(runtimeState.config.remoteFlushIntervalMs, 5000), 500);
    if (!force && now - Number(runtimeState.remoteSocketPacketLastFlushAt || 0) < intervalMs) {
      return;
    }
    var batchSize = Math.max(toInt(runtimeState.config.remoteLoggingBatchSize, 10), 1);
    var entries = runtimeState.remoteSocketPacketQueue.slice(0, batchSize);
    var endpoint = buildRemoteServiceUrl(
      runtimeState.config,
      runtimeState.config.remoteSocketPacketIngestPath || "/api/v1/socket/packets"
    );
    if (!endpoint) {
      return;
    }
    runtimeState.remoteSocketPacketFlushInFlight = true;
    sendRemoteRequest(endpoint, {
      method: "POST",
      headers: buildRemoteHeaders(runtimeState.config),
      body: JSON.stringify({
        clientId: String(runtimeState.config.remoteClientId || "default"),
        sessionId: String(runtimeState.remoteSessionId || buildRuntimeSessionId()),
        version: getRuntimeScriptVersion(),
        entries: entries,
      }),
    })
      .then(function (response) {
        runtimeState.remoteSocketPacketLastHttpStatus =
          Number(response && response.status ? response.status : 0) || 0;
        if (!response || !response.ok) {
          throw new Error("remote_socket_packet_http_" + String(response ? response.status : 0));
        }
        return response.json().catch(function () {
          return {};
        });
      })
      .then(function () {
        runtimeState.remoteSocketPacketQueue.splice(0, entries.length);
        runtimeState.remoteSocketPacketLastSuccessAt = Date.now();
        runtimeState.remoteSocketPacketLastError = "";
        runtimeState.remoteSocketPacketLastErrorAt = 0;
      })
      .catch(function (err) {
        runtimeState.remoteSocketPacketLastError =
          err && err.message
            ? String(err.message)
            : String(err || "remote_socket_packet_failed");
        runtimeState.remoteSocketPacketLastErrorAt = Date.now();
        emitConsoleLog(
          "warn",
          "REMOTE",
          "原始 socket 上报失败: " + runtimeState.remoteSocketPacketLastError,
          {
            endpoint: endpoint,
            clientId: String(runtimeState.config.remoteClientId || "default"),
            queueLength: Array.isArray(runtimeState.remoteSocketPacketQueue)
              ? runtimeState.remoteSocketPacketQueue.length
              : 0,
            status: Number(runtimeState.remoteSocketPacketLastHttpStatus || 0) || 0,
          }
        );
      })
      .finally(function () {
        runtimeState.remoteSocketPacketLastFlushAt = Date.now();
        runtimeState.remoteSocketPacketFlushInFlight = false;
        if (runtimeState.remoteSocketPacketQueue.length >= batchSize) {
          setTimeout(function () {
            flushRemoteSocketPacketQueue(false);
          }, 120);
        }
      });
  }

  function pullRemoteConfig(force) {
    if (
      !runtimeState ||
      !runtimeState.config ||
      !runtimeState.config.remoteConfigEnabled ||
      !canUseRemoteService(runtimeState.config) ||
      runtimeState.remoteConfigSyncInFlight
    ) {
      return;
    }
    var now = Date.now();
    var refreshMs = Math.max(toInt(runtimeState.config.remoteConfigRefreshMs, 60000), 5000);
    if (!force && now - Number(runtimeState.remoteLastConfigSyncAt || 0) < refreshMs) {
      return;
    }
    var endpoint = buildRemoteServiceUrl(
      runtimeState.config,
      runtimeState.config.remoteConfigPath || "/api/v1/config/latest"
    );
    if (!endpoint) {
      return;
    }
    var joiner = endpoint.indexOf("?") >= 0 ? "&" : "?";
    var url =
      endpoint +
      joiner +
      "client_id=" +
      encodeURIComponent(String(runtimeState.config.remoteClientId || "default"));
    runtimeState.remoteConfigSyncInFlight = true;
    sendRemoteRequest(url, {
      method: "GET",
      headers: buildRemoteHeaders(runtimeState.config),
    })
      .then(function (response) {
        runtimeState.remoteLastConfigHttpStatus = Number(response && response.status ? response.status : 0) || 0;
        if (!response || !response.ok) {
          throw new Error("remote_config_http_" + String(response ? response.status : 0));
        }
        return response.json();
      })
      .then(function (payload) {
        runtimeState.remoteLastConfigSyncAt = Date.now();
        runtimeState.remoteLastConfigSuccessAt = runtimeState.remoteLastConfigSyncAt;
        runtimeState.remoteLastConfigError = "";
        runtimeState.remoteLastConfigErrorAt = 0;
        var configPatch =
          payload && payload.config && "object" == typeof payload.config ? payload.config : null;
        if (!configPatch) {
          return;
        }
        runtimeState.config = mergeConfig(configPatch);
        persistConfigToLocalSettings(runtimeState.config);
        syncPanelAfterRemoteUpdate();
      })
      .catch(function (err) {
        runtimeState.remoteLastConfigError =
          err && err.message ? String(err.message) : String(err || "remote_config_failed");
        runtimeState.remoteLastConfigErrorAt = Date.now();
        emitConsoleLog(
          "warn",
          "REMOTE",
          "远端配置拉取失败: " + runtimeState.remoteLastConfigError,
          {
            url: url,
            clientId: String(runtimeState.config.remoteClientId || "default"),
            status: Number(runtimeState.remoteLastConfigHttpStatus || 0) || 0,
          }
        );
      })
      .finally(function () {
        runtimeState.remoteConfigSyncInFlight = false;
      });
  }

  function testRemoteTransport() {
    if (!runtimeState || !runtimeState.config) {
      return Promise.reject(new Error("runtime_not_ready"));
    }
    var endpoint = buildRemoteServiceUrl(
      runtimeState.config,
      runtimeState.config.remoteIngestPath || "/api/v1/logs"
    );
    if (!endpoint) {
      runtimeState.remoteLastError = "remote_endpoint_empty";
      runtimeState.remoteLastErrorAt = Date.now();
      emitConsoleLog("warn", "REMOTE", "远端测试失败: remote_endpoint_empty");
      return Promise.reject(new Error("remote_endpoint_empty"));
    }
    if (!runtimeState.remoteSessionId) {
      runtimeState.remoteSessionId = buildRuntimeSessionId();
    }
    var payload = {
      clientId: String(runtimeState.config.remoteClientId || "default"),
      sessionId: String(runtimeState.remoteSessionId || buildRuntimeSessionId()),
      version: getRuntimeScriptVersion(),
      entries: [
        {
          kind: "TEST",
          tag: "TEST",
          level: "log",
          text: "manual remote transport test",
          ts: Date.now(),
          payload: {
            type: "manual_remote_test",
            monitorOnly: !!runtimeState.config.monitorOnly,
            serviceBaseUrl: String(runtimeState.config.remoteServiceBaseUrl || ""),
          },
        },
      ],
    };
    emitConsoleLog("log", "REMOTE", "开始远端测试: " + endpoint, payload);
    return sendRemoteRequest(endpoint, {
      method: "POST",
      headers: buildRemoteHeaders(runtimeState.config),
      body: JSON.stringify(payload),
    })
      .then(function (response) {
        runtimeState.remoteLastHttpStatus = Number(response && response.status ? response.status : 0) || 0;
        if (!response || !response.ok) {
          throw new Error("remote_test_http_" + String(response ? response.status : 0));
        }
        return response.json().catch(function () {
          return {};
        });
      })
      .then(function (result) {
        runtimeState.remoteLastSuccessAt = Date.now();
        runtimeState.remoteLastError = "";
        runtimeState.remoteLastErrorAt = 0;
        emitConsoleLog("log", "REMOTE", "远端测试成功", result);
        syncPanelStatus();
        return result;
      })
      .catch(function (err) {
        runtimeState.remoteLastError = err && err.message ? String(err.message) : String(err || "remote_test_failed");
        runtimeState.remoteLastErrorAt = Date.now();
        emitConsoleLog("warn", "REMOTE", "远端测试失败: " + runtimeState.remoteLastError, {
          endpoint: endpoint,
          status: Number(runtimeState.remoteLastHttpStatus || 0) || 0,
        });
        syncPanelStatus();
        throw err;
      });
  }

  function buildPersistedConfigPatch(config) {
    var source = pickObject(config);
    var next = {};
    if (void 0 !== source.dynamicTargeting) {
      next.dynamicTargeting = false !== source.dynamicTargeting;
    }
    if (void 0 !== source.stopLossRatio) {
      next.stopLossRatio = clamp(toNumber(source.stopLossRatio, 0.05), 0.001, 0.9);
    }
    if (void 0 !== source.takeProfitRatio) {
      next.takeProfitRatio = clamp(toNumber(source.takeProfitRatio, 0.12), 0, 3);
    }
    if (void 0 !== source.monitorOnly) {
      next.monitorOnly = !!source.monitorOnly;
    }
    if (void 0 !== source.remoteLoggingEnabled) {
      next.remoteLoggingEnabled = !!source.remoteLoggingEnabled;
    }
    if (void 0 !== source.remoteConfigEnabled) {
      next.remoteConfigEnabled = !!source.remoteConfigEnabled;
    }
    if (void 0 !== source.remoteServiceBaseUrl) {
      next.remoteServiceBaseUrl = String(source.remoteServiceBaseUrl || "").trim();
    }
    if (void 0 !== source.remoteIngestPath) {
      next.remoteIngestPath = String(source.remoteIngestPath || "/api/v1/logs").trim();
    }
    if (void 0 !== source.remoteConfigPath) {
      next.remoteConfigPath = String(source.remoteConfigPath || "/api/v1/config/latest").trim();
    }
    if (void 0 !== source.remoteClientId) {
      next.remoteClientId = String(source.remoteClientId || "default").trim();
    }
    if (void 0 !== source.remoteApiKey) {
      next.remoteApiKey = String(source.remoteApiKey || "").trim();
    }
    return next;
  }

  function persistConfigToLocalSettings(config) {
    var patch = buildPersistedConfigPatch(config);
    var hasValue = false;
    var key = "";
    for (key in patch) {
      hasValue = true;
      break;
    }
    if (hasValue) {
      writeLocalSettings(patch);
    }
    return patch;
  }

  function resolveInitialBalanceValue(explicitValue) {
    if (explicitValue > 0) {
      return normalizeExternalMoneyToRaw(explicitValue);
    }
    var playerRuntime = getSelfPlayerRuntime();
    if (playerRuntime && playerRuntime.currentBalance > 0) {
      return playerRuntime.currentBalance;
    }
    if (runtimeState && Number(runtimeState.lastKnownBalance || 0) > 0) {
      return Number(runtimeState.lastKnownBalance || 0) || 0;
    }
    return Math.max(toNumber(runtimeState && runtimeState.initialBalance, 0), 0);
  }

  function normalizeStartInput(input) {
    var source = pickObject(input);
    var configSource = pickObject(source.basePlanConfig || source.planConfig || source);
    var mergedConfigSource = cloneObject(configSource);
    var nestedOptions = pickObject(configSource.options);
    var key = "";
    for (key in nestedOptions) {
      mergedConfigSource[key] = nestedOptions[key];
    }
    var config = mergeConfig(mergedConfigSource);
    return {
      config: config,
      initialBalance:
        void 0 === source.initialBalance
          ? void 0
          : Math.max(normalizeExternalMoneyToRaw(source.initialBalance), 0),
    };
  }

  function getBuiltInStrategyPresets() {
    return {
      conservative_target16: {
        name: "conservative_target16",
        description: "保守动态模式，所有鱼参与评分，按实时命中率与稳定帧决策",
        dynamicTargeting: true,
        idleKeepaliveEnabled: false,
        joinCooldownMs: 6000,
        roomWarmupMs: 10000,
        nativeSceneSettleMs: 3500,
        idleKeepaliveRequireReadySeconds: 22,
        manualFireCooldownMs: 700,
        nativeBlockedSoftRecoverThreshold: 1,
        nativeBlockedRecoveryCooldownMs: 500,
        nativeBlockedResetThreshold: 3,
        riskCooldownMs: 12000,
        maxConsecutiveMissShots: 3,
        missStreakLeaveThreshold: 4,
        precisionBlockedLeaveThreshold: 5,
        aimModeWarmupMs: 500,
        betChangeCooldownMs: 1600,
        targetFishIds: [2, 3, 19, 101],
        precisionPrimaryTargetIds: [2, 3, 19, 101],
        precisionSecondaryTargetIds: [1, 17],
        precisionBlacklistTargetIds: BUILT_IN_BLACKLIST_TARGET_IDS.slice(),
        precisionBlacklistMinTargetId: 100,
        precisionBlacklistMinSymbolId: 100,
        precisionBlacklistSymbolIds: [],
        precisionBlacklistOdds: BUILT_IN_BLACKLIST_ODDS.slice(),
        precisionBlacklistNameKeywords: ["财神"],
        roomTemporaryTargetBlockEnabled: true,
        roomTemporaryTargetBlockMinSamples: 2,
        roomTemporaryTargetBlockMaxRtpRatio: 0.12,
        minHitProbability: 60,
        minStableSeenTicks: 2,
        mediumOddsThreshold: 20,
        highOddsThreshold: 30,
        mediumScoreThreshold: 62,
        highScoreThreshold: 92,
        minCandidateScore: 46,
        combatPeerNetFloor: -0.03,
        combatWarmingPeerHitFloor: 0.025,
        combatOpenPeerHitFloor: 0.02,
        combatSelfNetFloor: -0.12,
        combatSelfRecoveryMinSamples: 5,
        peerHotSelfColdBlockEnabled: true,
        peerHotSelfColdBlockMinPeerNetRatio: 0.08,
        peerHotSelfColdBlockMaxSelfNetRatio: -0.35,
        peerHotSelfColdBlockMaxHighMechanismRate: 0.02,
        peerHotSelfColdBlockMinSelfSamples: 4,
        allowWarmingEmptyOddsPrecision: true,
        warmingEmptyOddsMinCandidateScore: 94,
        warmingEmptyOddsMinHitProbability: 98,
        warmingEmptyOddsMinStableSeenTicks: 8,
        warmingEmptyOddsMinWaterScore: 60,
        warmingEmptyOddsMinHighOddRate: 0.67,
        warmingEmptyOddsMinHighMechanismRate: 0.06,
        warmingEmptyOddsMinPeerNetRatio: 0,
        warmingEmptyOddsMinRoomStaySeconds: 18,
        warmingEmptyOddsWaitedMinCandidateScore: 92,
        warmingEmptyOddsWaitedMinHitProbability: 98,
        warmingEmptyOddsWaitedMinStableSeenTicks: 6,
        warmingEmptyOddsWaitedMinWaterScore: 50,
        warmingEmptyOddsWaitedMinHighOddRate: 0.6,
        warmingEmptyOddsWaitedMinHighMechanismRate: 0.04,
        warmingEmptyOddsStrongHotMinCandidateScore: 94,
        warmingEmptyOddsStrongHotMinHitProbability: 98,
        warmingEmptyOddsStrongHotMinStableSeenTicks: 16,
        warmingEmptyOddsStrongHotMinWaterScore: 52,
        warmingEmptyOddsStrongHotMinHighOddRate: 0.58,
        warmingEmptyOddsStrongHotMinPeerNetRatio: -0.05,
        warmingEmptyOddsCommitWindowMs: 3500,
        warmingEmptyOddsCommitMinCandidateScore: 91,
        warmingEmptyOddsCommitMinHitProbability: 98,
        warmingEmptyOddsCommitMinStableSeenTicks: 6,
        warmingEmptyOddsCommitMinWaterScore: 48,
        warmingEmptyOddsCommitMinHighOddRate: 0.56,
        warmingEmptyOddsCommitMinHighMechanismRate: 0.05,
        warmingEmptyOddsMaxShotsPerRoom: 1,
        maxPendingFireOutcomes: 1,
        pendingFireOutcomeTimeoutMs: 2800,
        roomMinResolvedShotsBeforeRamp: 1,
        requireRoomHitBeforeRamp: true,
        takeProfitRatio: 0.12,
        weakSignalNeutralThreshold: 999,
        weakSignalMinRoomStaySeconds: 30,
        peerRecoveryBypassMinCandidateScore: 92,
        peerRecoveryBypassMinHitProbability: 97,
        peerRecoveryBypassMinStableSeenTicks: 5,
        peerRecoveryBypassMinWaterScore: 42,
        peerRecoveryBypassMinHighOddRate: 0.64,
        peerRecoveryBypassMinHighMechanismRate: 0.06,
        postHitMaxRampStepsWithoutHighConfirmed: 0,
        postHitMaxRampStepsWithHighConfirmed: 1,
        postHitRampMinProfitRaw: 1.2,
        postHitRampMinHitCount: 2,
        rampMinResolvedShotsBeforeScaleUp: 2,
        rampMinResolvedHitsBeforeScaleUp: 1,
        rampMinRoomProfitRawBeforeScaleUp: 0,
        rampStrongWaterMinScore: 56,
        rampStrongWaterMinPeerNetRatio: 0,
        postHitMaxGivebackRatio: 0.65,
        postHitProfitProtectMinRaw: 0,
        postHitLeaveWhenProfitTurnsNegative: true,
        probeAfterObserveSeconds: 5,
        probeCandidateScoreThreshold: 60,
        probeHitProbabilityThreshold: 82,
        allowWarmingNeutralProbe: false,
        warmingNeutralProbeMinCandidateScore: 90,
        warmingNeutralProbeMinHitProbability: 97,
        warmingNeutralProbeMinStableSeenTicks: 4,
        warmingNeutralProbeMinWaterScore: 34,
        warmingNeutralProbeMinHighOddRate: 0.58,
        warmingNeutralProbeMinPeerNetRatio: 0,
        warmingNeutralProbeMinHighMechanismRate: 0.03,
        warmingNeutralProbeFallbackWaterScore: 39,
        warmingNeutralProbeFallbackPeerNetRatio: 0.05,
        warmingNeutralProbeFallbackHighOddRate: 0.52,
        warmingNeutralProbeMinDistanceOpenFireScore: 28,
        selfLossStreakProbeMinWaterScore: 46,
        selfLossStreakProbeMinPeerNetRatio: 0.15,
        selfLossStreakProbeMinHighOddRate: 0.2,
        selfLossStreakProbeMinCandidateScore: 140,
        selfLossStreakProbeMinHitProbability: 98,
        selfLossStreakProbeMinStableSeenTicks: 4,
        selfLossStreakProbeMaxRoomLossRaw: 0.35,
        selfLossStreakPrecisionProbeTargetIds: [2, 3, 19],
        selfLossStreakPrecisionProbeMinCandidateScore: 150,
        selfLossStreakPrecisionProbeMinHitProbability: 98,
        selfLossStreakPrecisionProbeMinStableSeenTicks: 6,
        selfLossStreakPrecisionProbeMaxRoomLossRaw: 0.25,
        selfLossStreakPrecisionProbeMaxMissShots: 2,
        selfLossStreakContinuationMinModeRate: 0.2,
        selfLossStreakContinuationMinUsableSamples: 12,
        selfLossStreakContinuationMinCandidateScore: 96,
        selfLossStreakContinuationMinHitProbability: 97,
        selfLossStreakContinuationMinStableSeenTicks: 4,
        selfLossStreakContinuationMaxRoomLossRaw: 0.45,
        selfLossStreakContinuationMaxMissShots: 3,
        allowColdRoomValidationProbe: false,
        postHitFollowupRequireBoundHit: true,
        strictHitTargetBinding: true,
        enableSelfLossStreakProbeBypass: false,
        coldRoomValidationObserveSeconds: 24,
        coldRoomValidationMinSamples: 220,
        coldRoomValidationMinCandidateScore: 93,
        coldRoomValidationMinHitProbability: 98,
        coldRoomValidationMinStableSeenTicks: 12,
        coldRoomValidationMinWaterScore: 28,
        coldRoomValidationMinPeerNetRatio: -0.3,
        coldRoomValidationMinHighOddRate: 0.18,
        coldRoomFollowupEnabled: true,
        coldRoomFollowupWindowSeconds: 12,
        coldRoomFollowupMaxShots: 2,
        coldRoomFollowupMinCandidateScore: 90,
        coldRoomFollowupMinHitProbability: 96,
        coldRoomFollowupMinStableSeenTicks: 6,
        strictWhitelistWhenOddsEmpty: false,
        allowEmptyOddsProbeForNeutral: true,
        emptyOddsProbeMinCandidateScore: 92,
        recheckBeforeFire: true,
        roomPaolevelConfig: {
          small: { min: 1, max: 2 },
          middle: { min: 1, max: 3 },
          large: { min: 1, max: 4 },
        },
      },
    };
  }

  function resolveStrategyPreset(input) {
    var presets = getBuiltInStrategyPresets();
    var key = String(input || "")
      .trim()
      .toLowerCase();
    return presets[key] ? cloneObject(presets[key]) : null;
  }

  function applyStrategyPreset(name, extraConfig) {
    var preset = resolveStrategyPreset(name);
    if (!preset) {
      throw new Error("未找到策略预设: " + String(name || ""));
    }
    var merged = cloneObject(preset);
    var extra = pickObject(extraConfig);
    var key = "";
    for (key in extra) {
      merged[key] = extra[key];
    }
    runtimeState.config = mergeConfig(merged);
    persistConfigToLocalSettings(runtimeState.config);
    syncPanelInputs();
    syncPanelStatus();
    return {
      preset: String(name || ""),
      config: runtimeState.config,
    };
  }

  function getNextRoomSize(state, config) {
    var rooms = normalizePreferredRooms(config.preferredRooms);
    if (!rooms.length) {
      return "small";
    }
    var index = Math.max(toInt(state.roomRotateIndex, 0), 0) % rooms.length;
    state.roomRotateIndex = (index + 1) % rooms.length;
    return rooms[index];
  }

  function clearPendingLeavePlan() {
    if (runtimeState.pendingLeaveTimer) {
      clearTimeout(runtimeState.pendingLeaveTimer);
      runtimeState.pendingLeaveTimer = 0;
    }
    runtimeState.pendingLeavePlan = null;
  }

  function buildHumanLeaveDelayMs(config) {
    var minMs = Math.max(toInt(config && config.humanLeaveMinDelayMs, 2000), 500);
    var maxMs = Math.max(toInt(config && config.humanLeaveMaxDelayMs, 5000), minMs);
    return minMs + Math.floor(Math.random() * Math.max(maxMs - minMs + 1, 1));
  }

  function buildRandomDelayMs(minInput, maxInput, fallbackMin, fallbackMax) {
    var minMs = Math.max(toInt(minInput, fallbackMin), 500);
    var maxMs = Math.max(toInt(maxInput, fallbackMax), minMs);
    return minMs + Math.floor(Math.random() * Math.max(maxMs - minMs + 1, 1));
  }

  function isBadRoomLeave(reason, payload) {
    var text = String(reason || "");
    var extra = payload && "object" == typeof payload ? payload : {};
    var roomProfitRaw = Number(extra.roomProfitRaw || 0) || 0;
    if (roomProfitRaw < 0) {
      return true;
    }
    return [
      "blocked_dead_room_leave_room",
      "blocked_room_timeout",
      "miss_streak_leave_room",
      "precision_empty_block_leave_room",
      "weak_signal_room",
      "no_candidate_timeout",
      "scan_unconfirmed_timeout",
      "post_hit_profit_drawdown_guard",
    ].indexOf(text) >= 0;
  }

  function isFastRejoinLeave(reason, payload) {
    var text = String(reason || "");
    if (
      [
        "blocked_dead_room_leave_room",
        "no_candidate_timeout",
        "scan_unconfirmed_timeout",
      ].indexOf(text) >= 0
    ) {
      return true;
    }
    var extra = payload && "object" == typeof payload ? payload : {};
    var roomResolvedShotCount = Math.max(
      toInt(
        extra.roomResolvedShotCount,
        runtimeState && runtimeState.roomResolvedShotCount
      ),
      0
    );
    var roomResolvedHitCount = Math.max(
      toInt(
        extra.roomResolvedHitCount,
        runtimeState && runtimeState.roomResolvedHitCount
      ),
      0
    );
    var roomProfitRaw = Number(
      void 0 === extra.roomProfitRaw
        ? runtimeState && runtimeState.roomProfitRaw
        : extra.roomProfitRaw
    ) || 0;
    return !!(
      "miss_streak_leave_room" === text &&
      roomResolvedShotCount <= 2 &&
      roomResolvedHitCount <= 0 &&
      roomProfitRaw <= 0
    );
  }

  function shouldAccumulateBadRoomStreak(reason, payload) {
    var text = String(reason || "");
    if (!isBadRoomLeave(text, payload)) {
      return false;
    }
    if (isFastRejoinLeave(text, payload)) {
      return false;
    }
    var extra = payload && "object" == typeof payload ? payload : {};
    var roomResolvedShotCount = Math.max(
      toInt(
        extra.roomResolvedShotCount,
        runtimeState && runtimeState.roomResolvedShotCount
      ),
      0
    );
    if (
      "blocked_dead_room_leave_room" === text &&
      roomResolvedShotCount <= 0 &&
      "native_fire_blocked" === String(extra.blockedReason || "")
    ) {
      return false;
    }
    return true;
  }

  function shouldApplyBadRoomPause(config, reason, payload) {
    if (!shouldAccumulateBadRoomStreak(reason, payload)) {
      return false;
    }
    var extra = payload && "object" == typeof payload ? payload : {};
    var roomResolvedShotCount = Math.max(
      toInt(
        extra.roomResolvedShotCount,
        runtimeState && runtimeState.roomResolvedShotCount
      ),
      0
    );
    var roomProfitRaw = Number(
      void 0 === extra.roomProfitRaw
        ? runtimeState && runtimeState.roomProfitRaw
        : extra.roomProfitRaw
    ) || 0;
    return !!(
      roomResolvedShotCount >=
        Math.max(toInt(config && config.badRoomPauseMinResolvedShots, 2), 0) ||
      roomProfitRaw <= -Math.max(toNumber(config && config.badRoomPauseMinLossRaw, 0.35), 0)
    );
  }

  function buildPostLeaveRejoinDelayMs(config, reason, payload) {
    if (isFastRejoinLeave(reason, payload)) {
      return buildRandomDelayMs(
        config && config.fastLeaveRejoinMinDelayMs,
        config && config.fastLeaveRejoinMaxDelayMs,
        1500,
        3200
      );
    }
    if (isBadRoomLeave(reason, payload)) {
      return buildRandomDelayMs(
        config && config.lossRoomRejoinMinDelayMs,
        config && config.lossRoomRejoinMaxDelayMs,
        5000,
        9000
      );
    }
    return buildRandomDelayMs(
      config && config.postLeaveRejoinMinDelayMs,
      config && config.postLeaveRejoinMaxDelayMs,
      2500,
      4500
    );
  }

  function scheduleLeaveRoomPlan(reason, payload) {
    var nextReason = String(reason || "leave_room");
    var extra = cloneObject(payload);
    var now = Date.now();
    if (
      runtimeState.pendingLeavePlan &&
      String(runtimeState.pendingLeavePlan.reason || "") === nextReason &&
      Number(runtimeState.pendingLeavePlan.dueAt || 0) > now
    ) {
      return runtimeState.pendingLeavePlan;
    }
    clearPendingLeavePlan();
    unlockFish();
    var delayMs = buildHumanLeaveDelayMs(runtimeState.config);
    var plan = {
      reason: nextReason,
      requestedAt: now,
      dueAt: now + delayMs,
      delayMs: delayMs,
      payload: extra,
    };
    runtimeState.pendingLeavePlan = plan;
    runtimeState.pendingLeaveTimer = setTimeout(function () {
      var activePlan = runtimeState.pendingLeavePlan;
      runtimeState.pendingLeaveTimer = 0;
      if (!activePlan || activePlan !== plan) {
        return;
      }
      runtimeState.pendingLeavePlan = null;
      try {
        var roomStatus = getRoomStatus(runtimeState.config.preferredRooms);
        if (!roomStatus.inRoom) {
          return;
        }
        var shouldAccumulateBadRoom = shouldAccumulateBadRoomStreak(nextReason, extra);
        runtimeState.badRoomStreak = shouldAccumulateBadRoom
          ? (Number(runtimeState.badRoomStreak || 0) || 0) + 1
          : 0;
        var rejoinDelayMs = buildPostLeaveRejoinDelayMs(runtimeState.config, nextReason, extra);
        if (
          runtimeState.badRoomStreak >=
            Math.max(toInt(runtimeState.config.badRoomPauseThreshold, 5), 1) &&
          shouldApplyBadRoomPause(runtimeState.config, nextReason, extra)
        ) {
          rejoinDelayMs += Math.max(toInt(runtimeState.config.badRoomPauseMs, 12000), 0);
        }
        runtimeState.nextAutoJoinAt = Date.now() + rejoinDelayMs;
        runtimeState.nextAutoJoinRoomSize = getNextRoomSize(runtimeState, runtimeState.config);
        runtimeState.lastRoomActionAt = Date.now();
        rememberDecision({
          type: "leave_room",
          reason: nextReason,
          roomStatus: roomStatus,
          roomProfitRaw: Number(extra.roomProfitRaw || 0) || 0,
          roomPeakProfitRaw: Number(extra.roomPeakProfitRaw || 0) || 0,
          roomProfitGivebackRaw: Number(extra.roomProfitGivebackRaw || 0) || 0,
          roomProfitGivebackRatio: Number(extra.roomProfitGivebackRatio || 0) || 0,
          badRoomStreak: Number(runtimeState.badRoomStreak || 0) || 0,
          nextAutoJoinRoomSize: String(runtimeState.nextAutoJoinRoomSize || ""),
          leaveDelayMs: delayMs,
          rejoinDelayMs: rejoinDelayMs,
          leaveResult: leaveRoom(),
          ts: Date.now(),
        });
      } catch (err) {
        rememberDecision({
          type: "leave_room_error",
          reason: err && err.message ? err.message : String(err || ""),
          ts: Date.now(),
        });
      }
    }, delayMs);
    return plan;
  }

  function stopByBalanceGuard(type, stopLossState) {
    clearTimer();
    runtimeState.active = false;
    runtimeState.stopLatched = true;
    runtimeState.stopLatchReason = String(type || "stop_loss_triggered");
    unlockFish();
    var roomStatus = getRoomStatus(runtimeState.config.preferredRooms);
    var leavePlan = roomStatus.inRoom
      ? scheduleLeaveRoomPlan(String(type || "stop_loss_triggered"), {
          roomStatus: roomStatus,
          stopLoss: stopLossState,
        })
      : null;
    return rememberDecision({
      type: String(type || "stop_loss_triggered"),
      reason:
        "take_profit_triggered" === String(type || "")
          ? "take_profit_reached"
          : "stop_loss_reached",
      roomStatus: roomStatus,
      stopLoss: stopLossState,
      leaveDueAt: leavePlan ? leavePlan.dueAt : 0,
      leaveDelayMs: leavePlan ? leavePlan.delayMs : 0,
      ts: Date.now(),
    });
  }

  function rememberPendingLeaveDecision(reason, payload, plan) {
    var extra = cloneObject(payload);
    return rememberDecision({
      type: "leave_room_pending",
      reason: String(reason || "leave_room"),
      stopLoss: extra.stopLoss,
      roomStatus: extra.roomStatus,
      analysis: extra.analysis,
      roomProfitRaw: extra.roomProfitRaw,
      roomPeakProfitRaw: extra.roomPeakProfitRaw,
      roomProfitGivebackRaw: extra.roomProfitGivebackRaw,
      roomProfitGivebackRatio: extra.roomProfitGivebackRatio,
      maxRoomLossRaw: extra.maxRoomLossRaw,
      weakSignalNeutralCount: extra.weakSignalNeutralCount,
      currentPaolevel: extra.currentPaolevel,
      desiredPaolevel: extra.desiredPaolevel,
      betResult: extra.betResult,
      stayMs: extra.stayMs,
      readyStayMs: extra.readyStayMs,
      riskCooldownUntil: extra.riskCooldownUntil,
      leaveDueAt: plan ? Number(plan.dueAt || 0) || 0 : 0,
      leaveDelayMs: plan ? Number(plan.delayMs || 0) || 0 : 0,
      remainingMs: plan ? Math.max((Number(plan.dueAt || 0) || 0) - Date.now(), 0) : 0,
      ts: Date.now(),
    });
  }

  function requestLeaveRoomWithPlan(reason, payload) {
    var nextReason = String(reason || "leave_room");
    var extra = cloneObject(payload);
    var roomStatus = pickObject(extra.roomStatus);
    if (!roomStatus.inRoom) {
      roomStatus = getRoomStatus(runtimeState.config.preferredRooms);
      extra.roomStatus = roomStatus;
    }
    if (!roomStatus.inRoom) {
      return rememberDecision({
        type: "leave_room_skipped",
        reason: nextReason + "_room_missing",
        stopLoss: extra.stopLoss,
        roomStatus: roomStatus,
        ts: Date.now(),
      });
    }
    var plan = scheduleLeaveRoomPlan(nextReason, extra);
    return rememberPendingLeaveDecision(nextReason, extra, plan);
  }

  function syncRoomLifecycle(roomStatus) {
    var roomKey = String(roomStatus && roomStatus.roomKey || "");
    if (roomKey !== runtimeState.lastRoomKey) {
      clearPendingLeavePlan();
      if (runtimeState.lastRoomKey && runtimeState.roomEntryBalance > 0) {
        runtimeState.lastRoomProfitRaw = runtimeState.roomProfitRaw;
      }
      runtimeState.lastRoomKey = roomKey;
      runtimeState.roomEnteredAt = roomStatus && roomStatus.inRoom ? Date.now() : 0;
      runtimeState.roomNativeStableAt =
        runtimeState.roomEnteredAt > 0
          ? runtimeState.roomEnteredAt +
            Math.max(toInt(runtimeState.config && runtimeState.config.nativeSceneSettleMs, 3500), 0)
          : 0;
      runtimeState.roomReadyAt = 0;
      runtimeState.roomIdleKeepaliveDueAt = 0;
      runtimeState.roomScanConfirmedAt = 0;
      runtimeState.postHitFollowupShotsUsed = 0;
      runtimeState.lastBattleGuideDismissAt = 0;
      runtimeState.battleGuideDismissCount = 0;
      runtimeState.roomColdValidationProbeFired = false;
      runtimeState.coldRoomFollowupShotsRemaining = 0;
      runtimeState.coldRoomFollowupUntil = 0;
      runtimeState.aimReadyAt = 0;
      runtimeState.nextAutoJoinAt = roomStatus && roomStatus.inRoom ? 0 : runtimeState.nextAutoJoinAt;
      runtimeState.nextAutoJoinRoomSize = roomStatus && roomStatus.inRoom ? "" : runtimeState.nextAutoJoinRoomSize;
      runtimeState.lastTarget = null;
      runtimeState.pendingFireOutcomes = [];
      runtimeState.recentSyncOutcomes = [];
      runtimeState.platformWaterProfile = null;
      runtimeState.platformWaterTrendHistory = [];
      runtimeState.roomEntryBalance = Number(runtimeState.lastKnownBalance || 0) || 0;
      runtimeState.roomProfitRaw = 0;
      runtimeState.roomPeakProfitRaw = 0;
      runtimeState.roomResolvedShotCount = 0;
      runtimeState.roomResolvedHitCount = 0;
      runtimeState.recentMissBlockedTargetId = 0;
      runtimeState.recentMissBlockedTargetUntil = 0;
      runtimeState.roomObservedSelfResolvedCount = 0;
      runtimeState.roomUntrackedSelfResolvedCount = 0;
      runtimeState.roomTargetOutcomeStats = {};
      runtimeState.roomTemporaryBlockedTargetIds = [];
      runtimeState.latestRoomTemporaryBlockedTarget = null;
      runtimeState.roomWarmingEmptyOddsFireCount = 0;
      runtimeState.warmingEmptyOddsCommitUntil = 0;
      runtimeState.consecutiveMissShots = 0;
      runtimeState.lastNativeRecoveryAt = 0;
      runtimeState.riskCooldownUntil = 0;
      runtimeState.weakSignalNeutralCount = 0;
      runtimeState.blockedReason = "";
      runtimeState.blockedReasonSinceAt = 0;
      runtimeState.blockedReasonLastSeenAt = 0;
      runtimeState.blockedReasonCount = 0;
      runtimeState.lastUntrackedSelfResolvedOutcome = null;
      unlockFish();
    }
  }

  function shouldLeaveBlockedRoom(state, config, roomStatus, analysis) {
    if (!roomStatus || !roomStatus.inRoom || !config || config.monitorOnly) {
      return false;
    }
    var profile = pickObject(state && state.platformWaterProfile);
    var profileLevel = String(profile.level || "");
    var profileScore = Number(profile.score || 0) || 0;
    var bestCandidate = analysis && analysis.bestCandidate ? analysis.bestCandidate : null;
    var bestScoreInfo = bestCandidate && bestCandidate.scoreInfo ? bestCandidate.scoreInfo : null;
    if (
      bestCandidate &&
      bestScoreInfo &&
      bestScoreInfo.specialEventCandidate &&
      (
        (Number(profile.highMechanismRate || 0) || 0) >=
          clamp(toNumber(config && config.specialEventWindowMinHighMechanismRate, 0.08), 0, 1) ||
        (Number(profile.openFeatureRate || 0) || 0) >=
          clamp(toNumber(config && config.specialEventWindowMinOpenFeatureRate, 0.16), 0, 1) ||
        (Number(profile.openFeatureHitRate || 0) || 0) >=
          clamp(toNumber(config && config.specialEventWindowMinOpenFeatureHitRate, 0.06), 0, 1)
      )
    ) {
      return false;
    }
    if (!(state.roomEnteredAt > 0) || !(state.blockedReasonSinceAt > 0)) {
      return false;
    }
    if (!isBlockedRoomLeaveReason(config, state.blockedReason)) {
      return false;
    }
    if (
      Date.now() - state.roomEnteredAt <
      Math.max(toInt(config.blockedRoomLeaveMinRoomStaySeconds, 16), 0) * 1000
    ) {
      return false;
    }
    if (
      Date.now() - state.blockedReasonSinceAt <
      (
        Math.max(toInt(config.blockedRoomLeaveSeconds, 22), 0) +
        (
          ("warming" === profileLevel || "open_suspected" === profileLevel) &&
          profileScore >=
            Math.max(toNumber(config.blockedRoomLeaveWarmingMinScore, 42), 1)
            ? Math.max(toInt(config.blockedRoomLeaveWarmingExtraSeconds, 18), 0)
            : 0
        )
      ) * 1000
    ) {
      return false;
    }
    if (Date.now() - state.lastRoomActionAt < config.joinCooldownMs) {
      return false;
    }
    if ((Number(state.roomResolvedHitCount || 0) || 0) > 0 && Number(state.roomProfitRaw || 0) > 0) {
      return false;
    }
    return true;
  }

  function buildPendingLeaveDecision(stopLossState, roomStatus) {
    var plan = runtimeState.pendingLeavePlan;
    var extra = plan ? pickObject(plan.payload) : {};
    if (!plan) {
      return null;
    }
    if (!roomStatus || !roomStatus.inRoom) {
      clearPendingLeavePlan();
      return null;
    }
    unlockFish();
    return rememberDecision({
      type: "leave_room_pending",
      reason: String(plan.reason || "leave_room"),
      stopLoss: stopLossState,
      roomStatus: roomStatus,
      roomProfitRaw: extra.roomProfitRaw,
      roomPeakProfitRaw: extra.roomPeakProfitRaw,
      roomProfitGivebackRaw: extra.roomProfitGivebackRaw,
      roomProfitGivebackRatio: extra.roomProfitGivebackRatio,
      leaveDueAt: Number(plan.dueAt || 0) || 0,
      leaveDelayMs: Number(plan.delayMs || 0) || 0,
      remainingMs: Math.max((Number(plan.dueAt || 0) || 0) - Date.now(), 0),
      ts: Date.now(),
    });
  }

  function isWeakSignalNeutralCandidate(analysis, config) {
    var best = analysis && analysis.bestCandidate ? analysis.bestCandidate : null;
    var scoreInfo = best && best.scoreInfo ? best.scoreInfo : null;
    var stableSeenTicks =
      scoreInfo && scoreInfo.captureStats
        ? Number(scoreInfo.captureStats.consecutiveSeenTicks || 0) || 0
        : 0;
    return !!(
      best &&
      "neutral" === String(scoreInfo && scoreInfo.tier || "") &&
      !(Number(best.oddsMax || 0) > 0) &&
      (Number(analysis.bestHitProbability || 0) || 0) >=
        Math.max(toNumber(config.weakSignalMinHitProbability, 90), 1) &&
      stableSeenTicks >= Math.max(toInt(config.weakSignalMinStableSeenTicks, 8), 1)
    );
  }

  function canProbeFire(roomStatus, analysis, state, config) {
    if (!config.allowProbeFire) {
      return false;
    }
    if (Date.now() < Number(state.riskCooldownUntil || 0)) {
      return false;
    }
    if (!roomStatus || !roomStatus.inRoom) {
      return false;
    }
    if (!analysis || !analysis.profitCandidate) {
      return false;
    }
    if (analysis.profitCandidateReady) {
      return false;
    }
    var stayMs = state.roomEnteredAt > 0 ? Date.now() - state.roomEnteredAt : 0;
    var minObserveMs = Math.max(toInt(config.probeAfterObserveSeconds, 0), 0) * 1000;
    if (stayMs < minObserveMs) {
      return false;
    }
    if (!(analysis.attackableCount > 0)) {
      return false;
    }
    var probeCandidate = analysis.profitCandidate;
    var probeScoreInfo = pickObject(probeCandidate.scoreInfo);
    if (probeCandidate.nativeCanAttackAvailable && !probeCandidate.nativeCanAttack) {
      return false;
    }
    if (!isWhitelistPrecisionTier(String(probeScoreInfo.tier || ""))) {
      return false;
    }
    if (Math.max(toInt(state && state.consecutiveMissShots, 0), 0) >= 1) {
      return false;
    }
    return (
      (Number(analysis.profitScore || 0) || 0) >=
        Math.max(toNumber(config.probeCandidateScoreThreshold, 20), 1) &&
      (Number(analysis.profitHitProbability || 0) || 0) >=
        Math.max(toNumber(config.probeHitProbabilityThreshold, 46), 1)
    );
  }

  function canColdRoomValidationFire(roomStatus, analysis, state, config, combatPolicy) {
    if (!config.allowProbeFire || !config.allowColdRoomValidationProbe) {
      return false;
    }
    if (!roomStatus || !roomStatus.inRoom || !analysis || !analysis.bestCandidate) {
      return false;
    }
    if (!combatPolicy || combatPolicy.allowCombat || "normal" !== String(combatPolicy.level || "")) {
      return false;
    }
    if (state.roomColdValidationProbeFired || Math.max(toInt(state.roomResolvedShotCount, 0), 0) > 0) {
      return false;
    }
    if (!(Number(state.roomScanConfirmedAt || 0) > 0)) {
      return false;
    }
    if (!(analysis.attackableCount > 0)) {
      return false;
    }
    var profile = pickObject(state.platformWaterProfile);
    if (
      (Number(profile.sampleCount || 0) || 0) <
      Math.max(toInt(config.coldRoomValidationMinSamples, 180), 1)
    ) {
      return false;
    }
    var stayMs = state.roomEnteredAt > 0 ? Date.now() - state.roomEnteredAt : 0;
    if (
      stayMs <
      Math.max(toInt(config.coldRoomValidationObserveSeconds, 24), 0) * 1000
    ) {
      return false;
    }
    var candidate = analysis.bestCandidate;
    if (Number(candidate.oddsMax || 0) > 0) {
      return false;
    }
    if (candidate.nativeCanAttackAvailable && !candidate.nativeCanAttack) {
      return false;
    }
    var info = pickObject(candidate.scoreInfo);
    if ("neutral" !== String(info.tier || "")) {
      return false;
    }
    if (
      (Number(analysis.bestScore || 0) || 0) <
      Math.max(toNumber(config.coldRoomValidationMinCandidateScore, 92), 1)
    ) {
      return false;
    }
    if (
      (Number(analysis.bestHitProbability || 0) || 0) <
      Math.max(toNumber(config.coldRoomValidationMinHitProbability, 97), 1)
    ) {
      return false;
    }
    if (
      Number(info.captureStats && info.captureStats.consecutiveSeenTicks || 0) <
      Math.max(toInt(config.coldRoomValidationMinStableSeenTicks, 8), 1)
    ) {
      return false;
    }
    if (
      (Number(profile.score || 0) || 0) <
      Math.max(toNumber(config.coldRoomValidationMinWaterScore, 28), 1)
    ) {
      return false;
    }
    if (
      (Number(profile.peerNetRatio || 0) || 0) <
      clamp(toNumber(config.coldRoomValidationMinPeerNetRatio, -0.3), -1, 1)
    ) {
      return false;
    }
    if (
      (Number(profile.highOddRate || 0) || 0) <
      clamp(toNumber(config.coldRoomValidationMinHighOddRate, 0.18), 0, 1)
    ) {
      return false;
    }
    return true;
  }

  function canColdRoomFollowupFire(roomStatus, analysis, state, config) {
    if (!config.allowProbeFire || !config.coldRoomFollowupEnabled) {
      return false;
    }
    if (!roomStatus || !roomStatus.inRoom || !analysis || !analysis.bestCandidate) {
      return false;
    }
    if (
      !(Number(state.coldRoomFollowupShotsRemaining || 0) > 0) ||
      !(Number(state.coldRoomFollowupUntil || 0) > Date.now())
    ) {
      return false;
    }
    if (!(Number(state.roomResolvedHitCount || 0) > 0)) {
      return false;
    }
    if (!(analysis.attackableCount > 0)) {
      return false;
    }
    var candidate = analysis.profitCandidate;
    if (!candidate) {
      return false;
    }
    if (candidate.nativeCanAttackAvailable && !candidate.nativeCanAttack) {
      return false;
    }
    var scoreInfo = pickObject(candidate.scoreInfo);
    if (
      Number(scoreInfo.captureStats && scoreInfo.captureStats.consecutiveSeenTicks || 0) <
      Math.max(toInt(config.coldRoomFollowupMinStableSeenTicks, 4), 1)
    ) {
      return false;
    }
    if (
      (Number(analysis.profitScore || 0) || 0) <
      Math.max(toNumber(config.coldRoomFollowupMinCandidateScore, 88), 1)
    ) {
      return false;
    }
    if (
      (Number(analysis.profitHitProbability || 0) || 0) <
      Math.max(toNumber(config.coldRoomFollowupMinHitProbability, 95), 1)
    ) {
      return false;
    }
    return true;
  }

  function getMaxRoomLossRaw(state, config) {
    var explicit = Math.max(toNumber(config.maxRoomLossAmount, 0), 0);
    if (explicit > 0) {
      return explicit;
    }
    if (!(toNumber(config.maxRoomLossRatio, 0) > 0)) {
      return 0;
    }
    return Math.max(
      toNumber(state.roomEntryBalance, 0) * clamp(toNumber(config.maxRoomLossRatio, 0), 0, 0.5),
      0
    );
  }

  function isRoomWarmupState(roomStatus, playerRuntime, betRuntime, analysis, state, config) {
    if (!roomStatus || !roomStatus.inRoom) {
      return false;
    }
    var stayMs = state.roomEnteredAt > 0 ? Date.now() - state.roomEnteredAt : 0;
    if (stayMs < Math.max(toInt(config.nativeSceneSettleMs, 3500), 0)) {
      return true;
    }
    if (stayMs > Math.max(toInt(config.roomWarmupMs, 6000), 0)) {
      return false;
    }
    var noCandidates = !(Number(analysis && analysis.candidateCount || 0) > 0);
    var balanceWarming = !playerRuntime.balanceAvailable || !!playerRuntime.usedFallbackBalance;
    var betWarming = !(Number(betRuntime && betRuntime.currentPaolevel || 0) > 0);
    return !!(balanceWarming || betWarming || noCandidates);
  }

  function isRoomNativeSettling(state, config) {
    if (!(state && Number(state.roomEnteredAt || 0) > 0)) {
      return false;
    }
    var stableAt = Number(state.roomNativeStableAt || 0) || 0;
    if (!(stableAt > 0)) {
      stableAt =
        (Number(state.roomEnteredAt || 0) || 0) +
        Math.max(toInt(config && config.nativeSceneSettleMs, 3500), 0);
    }
    return Date.now() < stableAt;
  }

  function mergeCombatPayload(base, extra) {
    var result = {};
    var source = base && "object" == typeof base ? base : {};
    var overrides = extra && "object" == typeof extra ? extra : {};
    var key = "";
    for (key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        result[key] = source[key];
      }
    }
    for (key in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        result[key] = overrides[key];
      }
    }
    return result;
  }

  function buildCombatDecisionPayload(context) {
    var runtimeState = context.runtimeState;
    var desired = context.desired;
    var combatPolicy = pickObject(desired && desired.combatPolicy);
    return {
      stopLoss: context.stopLossState,
      roomStatus: context.roomStatus,
      analysis: context.analysis,
      roomProfitRaw: runtimeState.roomProfitRaw,
      maxRoomLossRaw: context.maxRoomLossRaw,
      consecutiveMissShots: runtimeState.consecutiveMissShots,
      riskCooldownUntil: runtimeState.riskCooldownUntil,
      weakSignalNeutralCount: runtimeState.weakSignalNeutralCount,
      currentPaolevel: desired.currentPaolevel,
      desiredPaolevel: desired.desiredPaolevel,
      combatPolicyAllowCombat: !!combatPolicy.allowCombat,
      combatPolicyProbeOnly: !!combatPolicy.probeOnly,
      combatPolicyLevel: String(combatPolicy.level || ""),
      combatPolicyReason: String(combatPolicy.reason || ""),
      betResult: context.betResult,
      ts: Date.now(),
    };
  }

  function buildCombatLeavePayload(context) {
    var runtimeState = context.runtimeState;
    var desired = context.desired;
    var combatPolicy = pickObject(desired && desired.combatPolicy);
    return {
      stopLoss: context.stopLossState,
      roomStatus: context.roomStatus,
      analysis: context.analysis,
      roomProfitRaw: runtimeState.roomProfitRaw,
      maxRoomLossRaw: context.maxRoomLossRaw,
      weakSignalNeutralCount: runtimeState.weakSignalNeutralCount,
      currentPaolevel: desired.currentPaolevel,
      desiredPaolevel: desired.desiredPaolevel,
      combatPolicyAllowCombat: !!combatPolicy.allowCombat,
      combatPolicyProbeOnly: !!combatPolicy.probeOnly,
      combatPolicyLevel: String(combatPolicy.level || ""),
      combatPolicyReason: String(combatPolicy.reason || ""),
      betResult: context.betResult,
    };
  }

  function shouldLeaveBlockedDeadRoom(runtimeState, config, roomStatus, analysis) {
    if (!runtimeState || !config || !roomStatus || !roomStatus.inRoom) {
      return false;
    }
    if (config.monitorOnly || runtimeState.pendingLeavePlan) {
      return false;
    }
    if ("native_fire_blocked" !== String(runtimeState.blockedReason || "")) {
      return false;
    }
    var lastBlockCode = String(
      runtimeState.lastNativeFireBlockDetail && runtimeState.lastNativeFireBlockDetail.code || ""
    );
    var blockedCount = Math.max(Number(runtimeState.blockedReasonCount || 0) || 0, 0);
    var nativeFireBlockedCount = Math.max(Number(runtimeState.nativeFireBlockedCount || 0) || 0, 0);
    var roomResolvedShotCount = Math.max(Number(runtimeState.roomResolvedShotCount || 0) || 0, 0);
    var roomResolvedHitCount = Math.max(Number(runtimeState.roomResolvedHitCount || 0) || 0, 0);
    var roomProfitRaw = Number(runtimeState.roomProfitRaw || 0) || 0;
    var noBulletLeaveAnchorAt = Math.max(
      Number(runtimeState.lastFireAt || 0) || 0,
      Number(runtimeState.roomEnteredAt || 0) || 0
    );
    var noBulletDeadRoom = !!(
      "no_bullet" === lastBlockCode &&
      nativeFireBlockedCount >= blockedCount
    );
    if (
      blockedCount <
      Math.max(
        toInt(
          noBulletDeadRoom
            ? config.blockedNoBulletLeaveThreshold
            : config.blockedDeadRoomLeaveThreshold,
          noBulletDeadRoom ? 2 : 5
        ),
        1
      )
    ) {
      return false;
    }
    if (
      Date.now() - Number(noBulletDeadRoom ? noBulletLeaveAnchorAt : runtimeState.lastRoomActionAt || 0) <
      Math.max(
        noBulletDeadRoom
          ? Math.max(toInt(config.blockedNoBulletMinStayMs, 2500), 1500)
          : toInt(config.joinCooldownMs, 6000),
        0
      )
    ) {
      return false;
    }
    if (
      Date.now() - Number(runtimeState.roomEnteredAt || 0) <
      Math.max(
        toInt(
          noBulletDeadRoom
            ? config.blockedNoBulletMinStayMs
            : config.blockedDeadRoomMinStayMs,
          noBulletDeadRoom ? 2500 : 8000
        ),
        0
      )
    ) {
      return false;
    }
    if (!noBulletDeadRoom && roomResolvedShotCount > 0) {
      return false;
    }
    if (nativeFireBlockedCount < blockedCount) {
      return false;
    }
    if (noBulletDeadRoom) {
      if (roomResolvedHitCount > 0 || roomProfitRaw > 0) {
        return false;
      }
      return true;
    }
    if (!analysis || !analysis.profitCandidateReady || !analysis.profitCandidate) {
      return false;
    }
    return true;
  }

  var combatController = {
    remember: function (context, extra) {
      return rememberDecision(
        mergeCombatPayload(buildCombatDecisionPayload(context), extra)
      );
    },
    requestLeave: function (context, reason, extra) {
      return requestLeaveRoomWithPlan(
        reason,
        mergeCombatPayload(buildCombatLeavePayload(context), extra)
      );
    },
    syncWeakSignalCounter: function (context) {
      var runtimeState = context.runtimeState;
      var desired = context.desired;
      var analysis = context.analysis;
      var weakSignalWaterLevel = String(
        runtimeState.platformWaterProfile && runtimeState.platformWaterProfile.level || ""
      );
      var ignoreWeakSignalLeave =
        "warming" === weakSignalWaterLevel || "open_suspected" === weakSignalWaterLevel;
      if (!desired.combatPolicy.allowCombat || ignoreWeakSignalLeave) {
        runtimeState.weakSignalNeutralCount = 0;
      } else if (isWeakSignalNeutralCandidate(analysis, runtimeState.config)) {
        runtimeState.weakSignalNeutralCount += 1;
      } else if (runtimeState.weakSignalNeutralCount > 0) {
        runtimeState.weakSignalNeutralCount = 0;
      }
    },
    tryForceLeave: function (context) {
      var runtimeState = context.runtimeState;
      var roomStatus = context.roomStatus;
      var leaveProfitCandidate =
        context.analysis && context.analysis.profitCandidate ? context.analysis.profitCandidate : null;
      var leaveProfitScoreInfo =
        leaveProfitCandidate && leaveProfitCandidate.scoreInfo ? leaveProfitCandidate.scoreInfo : null;
      var leaveProfitTargetId = Number(
        leaveProfitCandidate &&
          (leaveProfitCandidate.tableEntityID || leaveProfitCandidate.symbolID || 0)
      ) || 0;
      var leaveProfitStableTicks = Number(
        leaveProfitScoreInfo &&
          leaveProfitScoreInfo.captureStats &&
          leaveProfitScoreInfo.captureStats.consecutiveSeenTicks || 0
      ) || 0;
      var leaveProfitScoreValue = Number(
        context.analysis && (context.analysis.profitScore || 0)
      ) || 0;
      if (!(leaveProfitScoreValue > 0)) {
        leaveProfitScoreValue = Number(
          leaveProfitScoreInfo &&
            (leaveProfitScoreInfo.score ||
              (leaveProfitScoreInfo.captureStats && leaveProfitScoreInfo.captureStats.score) ||
              0)
        ) || 0;
      }
      var leaveProfitHitProbabilityValue = Number(
        context.analysis && (context.analysis.profitHitProbability || 0)
      ) || 0;
      if (!(leaveProfitHitProbabilityValue > 0)) {
        leaveProfitHitProbabilityValue = Number(
          leaveProfitScoreInfo &&
            (leaveProfitScoreInfo.hitProbability ||
              (leaveProfitScoreInfo.captureStats &&
                leaveProfitScoreInfo.captureStats.hitProbability) ||
              0)
        ) || 0;
      }
      var allowMissStreakProbeBeforeLeave =
        !!(
          context.analysis &&
          context.analysis.profitCandidateReady &&
          "primary" === String(leaveProfitScoreInfo && leaveProfitScoreInfo.tier || "") &&
          includesNumber([2, 3, 19], leaveProfitTargetId) &&
          leaveProfitScoreValue >= 138 &&
          leaveProfitHitProbabilityValue >= 98 &&
          leaveProfitStableTicks >= 4 &&
          (Number(runtimeState && runtimeState.roomProfitRaw || 0) || 0) >= -0.4
        );
      if (
        shouldLeaveBlockedDeadRoom(
          runtimeState,
          runtimeState.config,
          roomStatus,
          context.analysis
        )
      ) {
        return this.requestLeave(context, "blocked_dead_room_leave_room", {
          blockedReason: runtimeState.blockedReason,
          blockedCount: Number(runtimeState.blockedReasonCount || 0) || 0,
          nativeFireBlockedCount: Number(runtimeState.nativeFireBlockedCount || 0) || 0,
          roomResolvedShotCount: Number(runtimeState.roomResolvedShotCount || 0) || 0,
          roomResolvedHitCount: Number(runtimeState.roomResolvedHitCount || 0) || 0,
        });
      }
      if (
        !runtimeState.config.monitorOnly &&
        roomStatus.inRoom &&
        !runtimeState.pendingLeavePlan &&
        !allowMissStreakProbeBeforeLeave &&
        runtimeState.consecutiveMissShots >=
          Math.max(toInt(runtimeState.config.missStreakLeaveThreshold, 3), 1) &&
        Date.now() - runtimeState.lastRoomActionAt >= runtimeState.config.joinCooldownMs
      ) {
        return this.requestLeave(context, "miss_streak_leave_room");
      }
      if (
        !runtimeState.config.monitorOnly &&
        roomStatus.inRoom &&
        !runtimeState.pendingLeavePlan &&
        "precision_non_whitelist_odds_empty" === String(runtimeState.blockedReason || "") &&
        (Number(runtimeState.blockedReasonCount || 0) || 0) >=
          Math.max(toInt(runtimeState.config.precisionBlockedLeaveThreshold, 3), 1) &&
        Date.now() - runtimeState.lastRoomActionAt >= runtimeState.config.joinCooldownMs
      ) {
        return this.requestLeave(context, "precision_empty_block_leave_room", {
          blockedReason: runtimeState.blockedReason,
          blockedCount: Number(runtimeState.blockedReasonCount || 0) || 0,
        });
      }
      if (
        !runtimeState.config.monitorOnly &&
        (
          !(runtimeState.roomEnteredAt > 0) ||
          Date.now() - runtimeState.roomEnteredAt >=
            Math.max(toInt(runtimeState.config.weakSignalMinRoomStaySeconds, 30), 0) * 1000
        ) &&
        runtimeState.weakSignalNeutralCount >=
          Math.max(toInt(runtimeState.config.weakSignalNeutralThreshold, 6), 1) &&
        Date.now() - runtimeState.lastRoomActionAt >= runtimeState.config.joinCooldownMs
      ) {
        return this.requestLeave(context, "weak_signal_room");
      }
      if (
        shouldLeaveBlockedRoom(
          runtimeState,
          runtimeState.config,
          context.roomStatus,
          context.analysis
        )
      ) {
        return this.requestLeave(context, "blocked_room_timeout", {
          blockedReason: runtimeState.blockedReason,
          blockedMs: Math.max(
            Date.now() - Number(runtimeState.blockedReasonSinceAt || 0),
            0
          ),
          blockedCount: Number(runtimeState.blockedReasonCount || 0) || 0,
        });
      }
      return null;
    },
    buildProbeState: function (context) {
      var runtimeState = context.runtimeState;
      var desired = context.desired;
      var analysis = context.analysis;
      var probeFireReady = canProbeFire(
        context.roomStatus,
        analysis,
        runtimeState,
        runtimeState.config
      );
      var coldRoomValidationReady = canColdRoomValidationFire(
        context.roomStatus,
        analysis,
        runtimeState,
        runtimeState.config,
        desired.combatPolicy
      );
      var postHitFollowupReady = canPostHitFollowupRampFire(
        context.roomStatus,
        analysis,
        runtimeState,
        runtimeState.config,
        desired.combatPolicy
      );
      var coldRoomFollowupReady = canColdRoomFollowupFire(
        context.roomStatus,
        analysis,
        runtimeState,
        runtimeState.config
      );
      var guardedProbeReady = !!(
        !desired.combatPolicy.allowCombat &&
        ("warming" === String(desired.combatPolicy.level || "") ||
          "open_suspected" === String(desired.combatPolicy.level || "")) &&
        analysis.candidateReady &&
        analysis.bestCandidate &&
        analysis.bestCandidate.scoreInfo &&
        (
          analysis.bestCandidate.scoreInfo.allowEmptyOddsProbe ||
          canAllowWarmingNeutralProbe(
            analysis.bestCandidate,
            analysis.bestCandidate.scoreInfo,
            runtimeState,
            runtimeState.config
          )
        )
      );
      return {
        normalCombatReady: !!(
        analysis.profitCandidateReady && desired.combatPolicy.allowCombat
        ),
        probeFireReady: probeFireReady,
        coldRoomValidationReady: coldRoomValidationReady,
        postHitFollowupReady: postHitFollowupReady,
        coldRoomFollowupReady: coldRoomFollowupReady,
        guardedProbeReady: guardedProbeReady,
        effectiveProbeReady: !!(
          probeFireReady ||
          guardedProbeReady ||
          coldRoomValidationReady ||
          coldRoomFollowupReady ||
          postHitFollowupReady
        ),
      };
    },
    tryIdleKeepalive: function (context, probeState) {
      var runtimeState = context.runtimeState;
      if (
        runtimeState.config.monitorOnly ||
        probeState.normalCombatReady ||
        probeState.effectiveProbeReady
      ) {
        return null;
      }
      var idleKeepaliveResult = fireController.fireIdleKeepalive(
        context.roomStatus,
        context.analysis,
        runtimeState,
        runtimeState.config,
        context.betRuntime,
        context.desired.combatPolicy
      );
      if (idleKeepaliveResult && idleKeepaliveResult.immediateLeaveDecision) {
        return idleKeepaliveResult.immediateLeaveDecision;
      }
      if (idleKeepaliveResult.fired) {
        return this.remember(context, {
          type: "attack",
          reason: "idle_keepalive_fire",
          desiredPaolevel: idleKeepaliveResult.desiredPaolevel,
          fireResult: idleKeepaliveResult,
        });
      }
      if (
        "idle_keepalive_syncing_min_bet" === String(idleKeepaliveResult.reason || "") ||
        "manual_fire_cooldown" === String(idleKeepaliveResult.reason || "") ||
        "native_fire_blocked" === String(idleKeepaliveResult.reason || "")
      ) {
        return this.remember(context, {
          type: "attack_waiting",
          reason: String(idleKeepaliveResult.reason || "idle_keepalive_waiting"),
          desiredPaolevel:
            Number(idleKeepaliveResult.desiredPaolevel || context.desired.desiredPaolevel) || 0,
          betResult: idleKeepaliveResult.betResult || context.betResult,
          fireResult: idleKeepaliveResult,
        });
      }
      return null;
    },
    tryMonitorOrCombatGate: function (context, probeState) {
      var runtimeState = context.runtimeState;
      var analysis = context.analysis;
      if (runtimeState.config.monitorOnly && analysis.bestCandidate) {
        unlockFish();
        return this.remember(context, {
          type: "monitor_only",
          reason: analysis.candidateReady || probeState.effectiveProbeReady
            ? "listen_only_candidate_observed"
            : "listen_only_observing",
          desiredPaolevel: context.desired.currentPaolevel,
        });
      }
      if (
        !runtimeState.config.monitorOnly &&
        !context.desired.combatPolicy.allowCombat &&
        !probeState.effectiveProbeReady
      ) {
        if (!(Number(analysis && analysis.candidateCount || 0) > 0)) {
          return null;
        }
        unlockFish();
        return this.remember(context, {
          type: "observe",
          reason: String(
            context.desired.combatPolicy.reason || "waiting_platform_water_warmup"
          ),
        });
      }
      return null;
    },
    tryCombatFire: function (context, probeState) {
      var runtimeState = context.runtimeState;
      var analysis = context.analysis;
      if (isActualBetAboveDesiredPaolevel(context.betRuntime, context.desired.desiredPaolevel)) {
        unlockFish();
        return this.remember(context, {
          type: "attack_waiting",
          reason:
            Number(context.desired && context.desired.desiredPaolevel || 0) <=
            Number(context.desired && context.desired.bounds && context.desired.bounds.min || 0)
              ? "combat_syncing_min_bet"
              : "combat_syncing_target_bet",
          currentBetCent: Number(context.betRuntime && context.betRuntime.currentBetCent || 0) || 0,
          desiredBetCent: getBetCentForPaolevel(
            context.betRuntime,
            context.desired && context.desired.desiredPaolevel
          ),
          currentPaolevel: Number(context.betRuntime && context.betRuntime.currentPaolevel || 0) || 0,
          desiredPaolevel: Number(context.desired && context.desired.desiredPaolevel || 0) || 0,
          betResult: context.betResult,
        });
      }
      var fireCandidateTarget =
        probeState.postHitFollowupReady
          ? pickPostHitFollowupCandidate(analysis, runtimeState, runtimeState.config)
          : probeState.normalCombatReady
            ? pickObject(analysis.profitCandidate || analysis.bestCandidate)
            : pickObject(analysis.bestCandidate);
      if (!((probeState.normalCombatReady || probeState.effectiveProbeReady) && fireCandidateTarget)) {
        if (probeState.postHitFollowupReady) {
          unlockFish();
          return this.remember(context, {
            type: "attack_waiting",
            reason: "post_hit_followup_target_lost",
          });
        }
        return null;
      }
      var fireMode =
        probeState.normalCombatReady && !context.desired.combatPolicy.probeOnly
          ? "normal"
          : probeState.postHitFollowupReady
            ? "post_hit_followup"
            : probeState.coldRoomFollowupReady
              ? "cold_followup"
              : probeState.coldRoomValidationReady
                ? "cold_probe"
                : "probe";
      var fireResult = fireController.fireCandidate(
        fireCandidateTarget,
        runtimeState,
        runtimeState.config,
        fireMode
      );
      if (fireResult && fireResult.immediateLeaveDecision) {
        return fireResult.immediateLeaveDecision;
      }
      if (fireResult.fired && "cold_probe" === fireMode) {
        runtimeState.roomColdValidationProbeFired = true;
      }
      if (fireResult.fired && "cold_followup" === fireMode) {
        runtimeState.coldRoomFollowupShotsRemaining = Math.max(
          (Number(runtimeState.coldRoomFollowupShotsRemaining || 0) || 0) - 1,
          0
        );
        if (!(runtimeState.coldRoomFollowupShotsRemaining > 0)) {
          runtimeState.coldRoomFollowupUntil = 0;
        }
      }
      if (fireResult.fired && "post_hit_followup" === fireMode) {
        runtimeState.postHitFollowupShotsUsed =
          (Number(runtimeState.postHitFollowupShotsUsed || 0) || 0) + 1;
      }
      return this.remember(context, {
        type: fireResult.fired ? "attack" : "attack_waiting",
        reason:
          !probeState.normalCombatReady && fireResult.reason === "manual_fire"
            ? "post_hit_followup" === fireMode
              ? "post_hit_followup_fire"
              : "cold_probe" === fireMode
                ? "cold_room_probe_fire"
                : "cold_followup" === fireMode
                  ? "cold_room_followup_fire"
                  : "probe_fire"
            : fireResult.reason,
        fireResult: fireResult,
      });
    },
    finalizeObserve: function (context) {
      var runtimeState = context.runtimeState;
      var analysis = context.analysis;
      unlockFish();
      var stayMs =
        runtimeState.roomEnteredAt > 0 ? Date.now() - runtimeState.roomEnteredAt : 0;
      var readyStayMs =
        runtimeState.roomReadyAt > 0 ? Date.now() - runtimeState.roomReadyAt : 0;
      var noCandidateLeaveMs = Math.max(
        Math.min(toInt(runtimeState.config.noCandidateLeaveSeconds, 0), 8),
        toInt(runtimeState.config.observeSeconds, 0)
      ) * 1000;
      var scanUnconfirmedLeaveMs = Math.max(
        Math.min(toInt(runtimeState.config.scanUnconfirmedLeaveSeconds, 0), 12),
        Math.min(toInt(runtimeState.config.noCandidateLeaveSeconds, 0), 8) + 4
      ) * 1000;
      var platformWaterProfile = pickObject(runtimeState.platformWaterProfile);
      var platformWaterInsufficientHoldMs = Math.max(
        toInt(runtimeState.config.platformWaterInsufficientHoldSeconds, 0),
        0
      ) * 1000;
      var platformWaterSamplingProtected = !!(
        "insufficient" === String(platformWaterProfile.level || "") &&
        platformWaterInsufficientHoldMs > 0 &&
        readyStayMs < platformWaterInsufficientHoldMs
      );
      if (
        !runtimeState.config.monitorOnly &&
        scanUnconfirmedLeaveMs > 0 &&
        runtimeState.roomReadyAt > 0 &&
        !(runtimeState.roomScanConfirmedAt > 0) &&
        !(Number(analysis.candidateCount || 0) > 0) &&
        !platformWaterSamplingProtected &&
        readyStayMs >= scanUnconfirmedLeaveMs &&
        Date.now() - runtimeState.lastRoomActionAt >= runtimeState.config.joinCooldownMs
      ) {
        return this.requestLeave(context, "scan_unconfirmed_timeout", {
          stayMs: stayMs,
          readyStayMs: readyStayMs,
        });
      }
      if (
        !runtimeState.config.monitorOnly &&
        noCandidateLeaveMs > 0 &&
        runtimeState.roomReadyAt > 0 &&
        runtimeState.roomScanConfirmedAt > 0 &&
        !(Number(analysis.candidateCount || 0) > 0) &&
        !platformWaterSamplingProtected &&
        readyStayMs >= noCandidateLeaveMs &&
        Date.now() - runtimeState.lastRoomActionAt >= runtimeState.config.joinCooldownMs
      ) {
        return this.requestLeave(context, "no_candidate_timeout", {
          stayMs: stayMs,
          readyStayMs: readyStayMs,
        });
      }
      return this.remember(context, {
        type: "observe",
        reason:
          !(runtimeState.roomScanConfirmedAt > 0) &&
          !(Number(analysis.candidateCount || 0) > 0)
            ? "scan_unconfirmed_waiting"
            : "waiting_high_value_target",
        stayMs: stayMs,
        readyStayMs: readyStayMs,
        roomScanConfirmedAt: runtimeState.roomScanConfirmedAt,
        remainingMs:
          runtimeState.roomReadyAt > 0
            ? Math.max(noCandidateLeaveMs - readyStayMs, 0)
            : noCandidateLeaveMs,
      });
    },
    decide: function (context) {
      var runtimeState = context.runtimeState;
      if (
        isRoomWarmupState(
          context.roomStatus,
          context.playerRuntime,
          context.betRuntime,
          context.analysis,
          runtimeState,
          runtimeState.config
        )
      ) {
        unlockFish();
        return this.remember(context, {
          type: "room_warmup",
          reason: "room_runtime_warming",
        });
      }
      if (!(runtimeState.roomReadyAt > 0)) {
        runtimeState.roomReadyAt = Date.now();
      }
      this.syncWeakSignalCounter(context);
      var forcedLeaveDecision = this.tryForceLeave(context);
      if (forcedLeaveDecision) {
        return forcedLeaveDecision;
      }
      var probeState = this.buildProbeState(context);
      var idleKeepaliveDecision = this.tryIdleKeepalive(context, probeState);
      if (idleKeepaliveDecision) {
        return idleKeepaliveDecision;
      }
      var gateDecision = this.tryMonitorOrCombatGate(context, probeState);
      if (gateDecision) {
        return gateDecision;
      }
      var fireDecision = this.tryCombatFire(context, probeState);
      if (fireDecision) {
        return fireDecision;
      }
      return this.finalizeObserve(context);
    },
  };

  function buildNativeReadyStatus() {
    return {
      puremvc: "undefined" != typeof puremvc && !!puremvc.Facade,
      attackModeProxy: !!getAttackModeProxyInstance(),
      seatProxy:
        "undefined" != typeof SeatProxy && "function" == typeof SeatProxy.getInstance,
      smartFox: !!getSmartFoxInstance(),
      symbolProxy:
        "undefined" != typeof SymbolProxy && "function" == typeof SymbolProxy.getInstance,
    };
  }

  function tickOnce() {
    flushRemoteLogQueue(false);
    flushRemoteSocketPacketQueue(false);
    pullRemoteConfig(false);
    ensureRuntimeSocketPacketHooks();
    var nativeReady = buildNativeReadyStatus();
    runtimeState.nativeReady =
      !!nativeReady.puremvc && !!nativeReady.attackModeProxy && !!nativeReady.seatProxy;
    if (!runtimeState.nativeReady) {
      return rememberDecision({
        type: "waiting_runtime",
        reason: "native_runtime_not_ready",
        nativeReady: nativeReady,
        ts: Date.now(),
      });
    }
    ensureSyncOutcomeBridge();

    var playerRuntime = getSelfPlayerRuntime();
    if (!(runtimeState.initialBalance > 0) && playerRuntime.currentBalance > 0) {
      runtimeState.initialBalance = playerRuntime.currentBalance;
    }
    var stopLossState = buildStopLossState(playerRuntime, runtimeState);
    if (stopLossState.hit) {
      return stopByBalanceGuard("stop_loss_triggered", stopLossState);
    }
    if (stopLossState.takeProfitHit) {
      return stopByBalanceGuard("take_profit_triggered", stopLossState);
    }
    if (runtimeState.stopLatched) {
      return rememberDecision({
        type: "latched",
        reason: runtimeState.stopLatchReason
          ? String(runtimeState.stopLatchReason) + "_latched"
          : "stop_loss_triggered_latched",
        stopLoss: stopLossState,
        ts: Date.now(),
      });
    }

    var roomStatus = getRoomStatus(runtimeState.config.preferredRooms);
    runtimeState.lastRoomStatus = roomStatus;
    syncRoomLifecycle(roomStatus);
    if (
      roomStatus.inRoom &&
      !(runtimeState.roomEntryBalance > 0) &&
      playerRuntime.balanceAvailable &&
      playerRuntime.currentBalance > 0
    ) {
      runtimeState.roomEntryBalance = Number(playerRuntime.currentBalance || 0) || 0;
      runtimeState.roomProfitRaw = 0;
      runtimeState.roomPeakProfitRaw = 0;
    }
    if (playerRuntime.currentBalance > 0 && runtimeState.roomEntryBalance > 0) {
      runtimeState.roomProfitRaw =
        (Number(playerRuntime.currentBalance || 0) || 0) -
        (Number(runtimeState.roomEntryBalance || 0) || 0);
      runtimeState.roomPeakProfitRaw = Math.max(
        Number(runtimeState.roomPeakProfitRaw || 0) || 0,
        Number(runtimeState.roomProfitRaw || 0) || 0,
        0
      );
    }
    if (runtimeState.pendingLeavePlan && roomStatus.inRoom) {
      return buildPendingLeaveDecision(stopLossState, roomStatus);
    }
    var postHitProfitGuard = getPostHitProfitGuard(runtimeState, runtimeState.config);
    if (
      roomStatus.inRoom &&
      !runtimeState.config.monitorOnly &&
      shouldLeaveByPostHitProfitGuard(postHitProfitGuard) &&
      Date.now() - runtimeState.lastRoomActionAt >= runtimeState.config.joinCooldownMs
    ) {
      return requestLeaveRoomWithPlan("post_hit_profit_drawdown_guard", {
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        roomProfitRaw: runtimeState.roomProfitRaw,
        roomPeakProfitRaw: postHitProfitGuard.roomPeakProfitRaw,
        roomProfitGivebackRaw: postHitProfitGuard.givebackRaw,
        roomProfitGivebackRatio: postHitProfitGuard.givebackRatio,
      });
    }

    if (roomStatus.inLobby) {
      unlockFish();
      if (!runtimeState.config.autoJoin) {
        return rememberDecision({
          type: "lobby_waiting",
          reason: "auto_join_disabled",
          stopLoss: stopLossState,
          roomStatus: roomStatus,
          ts: Date.now(),
        });
      }
      if (Date.now() - runtimeState.lastRoomActionAt < runtimeState.config.joinCooldownMs) {
        return rememberDecision({
          type: "join_cooldown",
          reason: "waiting_join_cooldown",
          stopLoss: stopLossState,
          roomStatus: roomStatus,
          remainingMs:
            runtimeState.config.joinCooldownMs - (Date.now() - runtimeState.lastRoomActionAt),
          ts: Date.now(),
        });
      }
      if (Number(runtimeState.nextAutoJoinAt || 0) > Date.now()) {
        return rememberDecision({
          type: "join_cooldown",
          reason: "waiting_post_leave_rejoin",
          stopLoss: stopLossState,
          roomStatus: roomStatus,
          remainingMs: (Number(runtimeState.nextAutoJoinAt || 0) || 0) - Date.now(),
          ts: Date.now(),
        });
      }
      var nextRoomSize = String(runtimeState.nextAutoJoinRoomSize || "") || getNextRoomSize(runtimeState, runtimeState.config);
      runtimeState.nextAutoJoinAt = 0;
      runtimeState.nextAutoJoinRoomSize = "";
      var joinResult = joinRoom({ roomSize: nextRoomSize });
      runtimeState.lastRequestedRoomSize = nextRoomSize;
      runtimeState.lastRoomActionAt = Date.now();
      return rememberDecision({
        type: "join_room",
        reason: "auto_join_from_lobby",
        requestedRoomSize: nextRoomSize,
        joinResult: joinResult,
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        ts: Date.now(),
      });
    }

    if (!roomStatus.inRoom) {
      var staleNonGameRoom =
        !!roomStatus.currentRoom && !roomStatus.currentRoom.isGame;
      if (
        runtimeState.config.autoJoin &&
        runtimeState.config.allowBootstrapJoinWhenUnknown &&
        (!roomStatus.currentRoom || staleNonGameRoom) &&
        Date.now() - runtimeState.lastRoomActionAt >= runtimeState.config.joinCooldownMs
      ) {
        if (Number(runtimeState.nextAutoJoinAt || 0) > Date.now()) {
          unlockFish();
          return rememberDecision({
            type: "join_cooldown",
            reason: "waiting_post_leave_rejoin",
            stopLoss: stopLossState,
            roomStatus: roomStatus,
            remainingMs: (Number(runtimeState.nextAutoJoinAt || 0) || 0) - Date.now(),
            ts: Date.now(),
          });
        }
        var bootstrapRoomSize =
          String(runtimeState.nextAutoJoinRoomSize || "") || getNextRoomSize(runtimeState, runtimeState.config);
        runtimeState.nextAutoJoinAt = 0;
        runtimeState.nextAutoJoinRoomSize = "";
        var bootstrapJoinResult = joinRoom({ roomSize: bootstrapRoomSize });
        runtimeState.lastRequestedRoomSize = bootstrapRoomSize;
        runtimeState.lastRoomActionAt = Date.now();
        return rememberDecision({
          type: "join_room_bootstrap",
          reason: "bootstrap_join_from_unknown",
          requestedRoomSize: bootstrapRoomSize,
          joinResult: bootstrapJoinResult,
          stopLoss: stopLossState,
          roomStatus: roomStatus,
          ts: Date.now(),
        });
      }
      unlockFish();
      return rememberDecision({
        type: "waiting_scene",
        reason: staleNonGameRoom ? "stale_non_game_room_waiting_rejoin" : "not_in_lobby_or_room",
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        ts: Date.now(),
      });
    }

    var battleGuideResult = dismissBattleGuideIfPresent(
      roomStatus,
      runtimeState,
      runtimeState.config
    );
    if (battleGuideResult.present) {
      unlockFish();
      return rememberDecision({
        type: "battle_guide",
        reason: battleGuideResult.reason,
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        battleGuide: battleGuideResult,
        ts: Date.now(),
      });
    }

    if (!roomStatus.roomReadyForAttack) {
      unlockFish();
      return rememberDecision({
        type: "room_loading",
        reason: "room_ui_not_ready",
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        ts: Date.now(),
      });
    }

    var maxRoomLossRaw = getMaxRoomLossRaw(runtimeState, runtimeState.config);

    if (Date.now() < Number(runtimeState.riskCooldownUntil || 0)) {
      unlockFish();
      return rememberDecision({
        type: "risk_cooldown",
        reason: "cooldown_after_miss_or_room_loss",
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        roomProfitRaw: runtimeState.roomProfitRaw,
        cooldownRemainingMs: runtimeState.riskCooldownUntil - Date.now(),
        consecutiveMissShots: runtimeState.consecutiveMissShots,
        ts: Date.now(),
      });
    }

    var analysis = analyzeCurrentRoom(runtimeState.config, runtimeState);
    runtimeState.lastAnalysis = analysis;
    if (!(runtimeState.roomScanConfirmedAt > 0) && Number(analysis.candidateCount || 0) > 0) {
      runtimeState.roomScanConfirmedAt = Date.now();
    }
    var betRuntime = getSelfBetRuntime();
    var desired = resolveDesiredPaolevel(
      roomStatus,
      analysis,
      runtimeState.config,
      betRuntime,
      runtimeState
    );
    runtimeState.lastDesired = cloneObject(desired);
    var betResult = applyBetStep(
      betRuntime,
      desired.desiredPaolevel,
      runtimeState,
      runtimeState.config
    );

    return combatController.decide({
      stopLossState: stopLossState,
      roomStatus: roomStatus,
      playerRuntime: playerRuntime,
      betRuntime: betRuntime,
      analysis: analysis,
      runtimeState: runtimeState,
      desired: desired,
      betResult: betResult,
      maxRoomLossRaw: maxRoomLossRaw,
    });
  }

  function start(input) {
    var normalized = normalizeStartInput(input);
    var previousKnownBalance = Math.max(toNumber(runtimeState.lastKnownBalance, 0), 0);
    var resolvedInitialBalance = Math.max(
      toNumber(resolveInitialBalanceValue(normalized.initialBalance), 0),
      previousKnownBalance
    );
    runtimeState.config = normalized.config;
    persistConfigToLocalSettings(runtimeState.config);
    pullRemoteConfig(true);
    ensureRuntimeSocketPacketHooks();
    runtimeState.stopLatched = false;
    runtimeState.active = true;
    runtimeState.lastKnownBalance = 0;
    runtimeState.lastKnownBalanceAt = 0;
    runtimeState.initialBalance = Math.max(resolvedInitialBalance, 0);
    clearTimer();
    enqueueRemoteLog("SESSION", "log", "remote session start", {
      type: "session_start",
      monitorOnly: !!runtimeState.config.monitorOnly,
      clientId: String(runtimeState.config.remoteClientId || "default"),
      serviceBaseUrl: String(runtimeState.config.remoteServiceBaseUrl || ""),
      ts: Date.now(),
    });
    runtimeState.timer = setInterval(function () {
      try {
        tickOnce();
      } catch (err) {
        rememberDecision({
          type: "error",
          reason: err && err.message ? err.message : String(err || ""),
          ts: Date.now(),
        });
      }
    }, runtimeState.config.intervalMs);
    return tickOnce();
  }

  function boot(input) {
    var source = pickObject(input);
    var merged = cloneObject(source);
    merged.autoJoin = true;
    if (!merged.options || "object" != typeof merged.options) {
      merged.options = {};
    }
    merged.options.autoJoin = true;
    if (void 0 === merged.options.bootstrapOnLoad) {
      merged.options.bootstrapOnLoad = true;
    }
    return start({
      initialBalance: source.initialBalance,
      basePlanConfig: source.basePlanConfig || source.planConfig || merged,
    });
  }

  function stop(options) {
    clearTimer();
    runtimeState.active = false;
    unlockFish();
    flushRemoteLogQueue(true);
    flushRemoteSocketPacketQueue(true);
    runtimeState.lastAnalysis = null;
    runtimeState.capture = {
      tickIndex: 0,
      samples: {},
      lastUpdatedAt: 0,
    };
    if (options && options.clearLatch) {
      runtimeState.stopLatched = false;
    }
    return rememberDecision({
      type: "stopped",
      reason: "manual_stop",
      ts: Date.now(),
    });
  }

  function getStatus() {
    refreshObservedAttackModeState(runtimeState);
    var playerRuntime = getSelfPlayerRuntime();
    var betRuntime = getSelfBetRuntime();
    var stopLossState = buildStopLossState(playerRuntime, runtimeState);
    var platformWaterActionGuard = buildPlatformWaterActionGuard(
      runtimeState,
      runtimeState.config
    );
    return {
      active: !!runtimeState.active,
      nativeReady: !!runtimeState.nativeReady,
      initialBalance: runtimeState.initialBalance,
      stopLatched: !!runtimeState.stopLatched,
      roomRotateIndex: runtimeState.roomRotateIndex,
      roomEnteredAt: runtimeState.roomEnteredAt,
      roomReadyAt: runtimeState.roomReadyAt,
      roomScanConfirmedAt: runtimeState.roomScanConfirmedAt,
      lastRoomKey: runtimeState.lastRoomKey,
      lastRoomActionAt: runtimeState.lastRoomActionAt,
      lastRequestedRoomSize: runtimeState.lastRequestedRoomSize,
      lastDecisionAt: runtimeState.lastDecisionAt,
      lastBetChangeAt: runtimeState.lastBetChangeAt,
      lastFireAt: runtimeState.lastFireAt,
      pendingFireCount: Array.isArray(runtimeState.pendingFireOutcomes)
        ? runtimeState.pendingFireOutcomes.filter(function (item) {
            return item && !item.resolved;
          }).length
        : 0,
      pendingFireOutcome: getLatestPendingFireOutcome(runtimeState),
      lastAimSwitchAt: runtimeState.lastAimSwitchAt,
      aimReadyAt: runtimeState.aimReadyAt,
      currentAttackModeId: Number(runtimeState.currentAttackModeId || 0) || 0,
      currentAttackModeLabel: String(runtimeState.currentAttackModeLabel || ""),
      lastTarget: runtimeState.lastTarget,
      lastResolvedFireOutcome: runtimeState.lastResolvedFireOutcome,
      lastUntrackedSelfResolvedOutcome: cloneObject(runtimeState.lastUntrackedSelfResolvedOutcome),
      recentSelfResolvedOutcomes: cloneArray(runtimeState.recentSelfResolvedOutcomes),
      lastFireAudit: runtimeState.lastFireAudit,
      nativeFireLeakCount: Number(runtimeState.nativeFireLeakCount || 0) || 0,
      nativeFireBlockedCount: Number(runtimeState.nativeFireBlockedCount || 0) || 0,
      nativeFireRecoveryCount: Number(runtimeState.nativeFireRecoveryCount || 0) || 0,
      nativeContinuousFireCount: Number(runtimeState.nativeContinuousFireCount || 0) || 0,
      targetBindingMismatchCount: Number(runtimeState.targetBindingMismatchCount || 0) || 0,
      observedSelfResolvedCount: Number(runtimeState.observedSelfResolvedCount || 0) || 0,
      untrackedSelfResolvedCount: Number(runtimeState.untrackedSelfResolvedCount || 0) || 0,
      roomObservedSelfResolvedCount: Number(runtimeState.roomObservedSelfResolvedCount || 0) || 0,
      roomUntrackedSelfResolvedCount:
        Number(runtimeState.roomUntrackedSelfResolvedCount || 0) || 0,
      lastObservedSelfFireAt: Number(runtimeState.lastObservedSelfFireAt || 0) || 0,
      lastObservedSelfFireModeId: Number(runtimeState.lastObservedSelfFireModeId || 0) || 0,
      lastObservedSelfFireModeLabel: String(runtimeState.lastObservedSelfFireModeLabel || ""),
      lastObservedSelfFireTargetId: Number(runtimeState.lastObservedSelfFireTargetId || 0) || 0,
      lastObservedSelfFireTargetSN: Number(runtimeState.lastObservedSelfFireTargetSN || 0) || 0,
      lastNativeFireBlockDetail: runtimeState.lastNativeFireBlockDetail
        ? cloneObject(runtimeState.lastNativeFireBlockDetail)
        : null,
      adaptiveBlacklistTargetIds: cloneArray(runtimeState.adaptiveBlacklistTargetIds),
      adaptiveBlacklistOdds: cloneArray(runtimeState.adaptiveBlacklistOdds),
      latestAdaptiveBlacklistTarget: cloneObject(runtimeState.latestAdaptiveBlacklistTarget),
      latestAdaptiveBlacklistOdd: cloneObject(runtimeState.latestAdaptiveBlacklistOdd),
      lastAdaptiveBlacklistAt: Number(runtimeState.lastAdaptiveBlacklistAt || 0) || 0,
      lastDesired: cloneObject(runtimeState.lastDesired),
      platformWaterProfile: runtimeState.platformWaterProfile,
      platformWaterActionGuard: cloneObject(platformWaterActionGuard),
      platformWaterTrendHistory: clonePlatformWaterTrendHistory(runtimeState, 48),
      mechanismSummary: buildSelfMechanismSummary(runtimeState),
      monitorOnly: !!runtimeState.config.monitorOnly,
      remote: {
        loggingEnabled: !!runtimeState.config.remoteLoggingEnabled,
        configEnabled: !!runtimeState.config.remoteConfigEnabled,
        serviceBaseUrl: String(runtimeState.config.remoteServiceBaseUrl || ""),
        clientId: String(runtimeState.config.remoteClientId || "default"),
        queueLength: Array.isArray(runtimeState.remoteLogQueue) ? runtimeState.remoteLogQueue.length : 0,
        lastFlushAt: Number(runtimeState.remoteLastFlushAt || 0) || 0,
        lastSuccessAt: Number(runtimeState.remoteLastSuccessAt || 0) || 0,
        lastHttpStatus: Number(runtimeState.remoteLastHttpStatus || 0) || 0,
        lastError: String(runtimeState.remoteLastError || ""),
        lastErrorAt: Number(runtimeState.remoteLastErrorAt || 0) || 0,
        lastConfigSyncAt: Number(runtimeState.remoteLastConfigSyncAt || 0) || 0,
        lastConfigSuccessAt: Number(runtimeState.remoteLastConfigSuccessAt || 0) || 0,
        lastConfigHttpStatus: Number(runtimeState.remoteLastConfigHttpStatus || 0) || 0,
        lastConfigError: String(runtimeState.remoteLastConfigError || ""),
        lastConfigErrorAt: Number(runtimeState.remoteLastConfigErrorAt || 0) || 0,
        sessionId: String(runtimeState.remoteSessionId || ""),
        socketPacketIngestPath: String(
          runtimeState.config.remoteSocketPacketIngestPath || "/api/v1/socket/packets"
        ),
        socketQueueLength: Array.isArray(runtimeState.remoteSocketPacketQueue)
          ? runtimeState.remoteSocketPacketQueue.length
          : 0,
        socketLastFlushAt: Number(runtimeState.remoteSocketPacketLastFlushAt || 0) || 0,
        socketLastSuccessAt: Number(runtimeState.remoteSocketPacketLastSuccessAt || 0) || 0,
        socketLastHttpStatus: Number(runtimeState.remoteSocketPacketLastHttpStatus || 0) || 0,
        socketLastError: String(runtimeState.remoteSocketPacketLastError || ""),
        socketLastErrorAt: Number(runtimeState.remoteSocketPacketLastErrorAt || 0) || 0,
        socketHookInstalled: !!runtimeState.runtimeSocketHookInstalled,
        socketWebSocketWrapped: !!runtimeState.runtimeSocketWebSocketWrapped,
        socketExistingAttached: !!runtimeState.runtimeSocketExistingAttached,
      },
      config: runtimeState.config,
      lastDecision: runtimeState.lastDecision,
      lastRoomStatus: runtimeState.lastRoomStatus,
      lastAnalysis: runtimeState.lastAnalysis,
      capture: {
        tickIndex: Number(runtimeState.capture.tickIndex || 0) || 0,
        lastUpdatedAt: Number(runtimeState.capture.lastUpdatedAt || 0) || 0,
        trackedTargetCount: Object.keys(runtimeState.capture.samples || {}).length,
      },
      lastKnownBalance: Number(runtimeState.lastKnownBalance || 0) || 0,
      lastKnownBalanceAt: Number(runtimeState.lastKnownBalanceAt || 0) || 0,
      roomProfitRaw: Number(runtimeState.roomProfitRaw || 0) || 0,
      roomPeakProfitRaw: Number(runtimeState.roomPeakProfitRaw || 0) || 0,
      lastRoomProfitRaw: Number(runtimeState.lastRoomProfitRaw || 0) || 0,
      consecutiveMissShots: Number(runtimeState.consecutiveMissShots || 0) || 0,
      riskCooldownUntil: Number(runtimeState.riskCooldownUntil || 0) || 0,
      weakSignalNeutralCount: Number(runtimeState.weakSignalNeutralCount || 0) || 0,
      pendingLeavePlan: runtimeState.pendingLeavePlan
        ? cloneObject(runtimeState.pendingLeavePlan)
        : null,
      stopLossState: stopLossState,
      money: {
        scale: MONEY_SCALE,
        initialBalance: formatMoneyFromRaw(runtimeState.initialBalance),
        currentBalance: formatMoneyFromRaw(playerRuntime.currentBalance),
        stopBalance: formatMoneyFromRaw(stopLossState.stopBalance),
        takeProfitBalance: formatMoneyFromRaw(stopLossState.takeProfitBalance),
        pnl: formatMoneyFromRaw(playerRuntime.currentBalance - runtimeState.initialBalance),
        lastKnownBalance: formatMoneyFromRaw(runtimeState.lastKnownBalance),
      },
      currentFish: getCurrentScreenFish(),
      playerRuntime: playerRuntime,
      betRuntime: betRuntime,
      runtimeCapabilities: buildNativeReadyStatus(),
    };
  }

  function formatDecisionText(decision) {
    var data = pickObject(decision);
    var stopLoss = pickObject(data.stopLoss);
    var analysis = pickObject(data.analysis);
    var roomStatus = pickObject(data.roomStatus);
    var fireResult = pickObject(data.fireResult);
    var betResult = pickObject(data.betResult);
    var lastResolvedFireOutcome = pickObject(data.lastResolvedFireOutcome);
    var lastFireAudit = pickObject(data.lastFireAudit);
    var pendingFireOutcome = pickObject(data.pendingFireOutcome);
    var platformWaterProfile = pickObject(data.platformWaterProfile);
    var mechanismSummary = pickObject(data.mechanismSummary);
    var latestAdaptiveBlacklistTarget = pickObject(data.latestAdaptiveBlacklistTarget);
    var latestAdaptiveBlacklistOdd = pickObject(data.latestAdaptiveBlacklistOdd);
    var recoveryActionText =
      Array.isArray(lastFireAudit.actions) && lastFireAudit.actions.length
        ? lastFireAudit.actions
            .filter(function (item) {
              return !!String(item || "");
            })
            .join(" -> ")
        : "";
    var recoveryBlockedCount = Number(lastFireAudit.blockedCount || 0) || 0;
    var lines = [];
    lines.push("状态: " + String(data.type || "-"));
    lines.push("原因: " + String(data.reason || "-"));
    lines.push("模式: " + (data.monitorOnly ? "监听" : "实战"));
    lines.push("房间: " + String(roomStatus.status || "-") + " / " + String(roomStatus.currentRoomSize || "-"));
    if (stopLoss.initialBalance > 0) {
      lines.push(
        "余额: " +
          formatMoneyFromRaw(stopLoss.currentBalance || 0) +
          " / 止损线 " +
          formatMoneyFromRaw(stopLoss.stopBalance || 0)
      );
      if (stopLoss.takeProfitAmount > 0) {
        lines.push("止盈线: " + formatMoneyFromRaw(stopLoss.takeProfitBalance || 0));
      }
      lines.push(
        "盈利: " + formatMoneyFromRaw((stopLoss.currentBalance || 0) - (stopLoss.initialBalance || 0))
      );
      if (!stopLoss.balanceAvailable && stopLoss.usedFallbackBalance) {
        lines.push(
          "余额来源: 回退到最近有效余额 / " + String(stopLoss.balanceSource || "-")
        );
      } else if (!stopLoss.balanceAvailable) {
        lines.push("余额来源: 当前帧不可用");
      } else if (stopLoss.balanceSource) {
        lines.push("余额来源: " + String(stopLoss.balanceSource || "-"));
      }
    }
    if (void 0 !== data.roomProfitRaw) {
      lines.push("本房盈亏: " + formatSignedMoneyFromRaw(data.roomProfitRaw || 0));
    }
    if (void 0 !== data.consecutiveMissShots) {
      lines.push("连续未中: " + String(data.consecutiveMissShots || 0));
    }
    if (
      (Number(data.recentMissBlockedTargetId || 0) || 0) > 0 &&
      (Number(data.recentMissBlockedRemainingMs || 0) || 0) > 0
    ) {
      lines.push(
        "同目标冷却: targetId=" +
          String(Number(data.recentMissBlockedTargetId || 0) || 0) +
          " / 剩余 " +
          String(
            Math.max(
              Math.ceil((Number(data.recentMissBlockedRemainingMs || 0) || 0) / 1000),
              0
            )
          ) +
          "s"
      );
    }
    if (
      void 0 !== data.adaptiveBlacklistTargetCount ||
      void 0 !== data.adaptiveBlacklistOddCount
    ) {
      lines.push(
        "自动黑名单: 目标 " +
          String(Number(data.adaptiveBlacklistTargetCount || 0) || 0) +
          " / 赔率 " +
          String(Number(data.adaptiveBlacklistOddCount || 0) || 0)
      );
    }
    if (Number(latestAdaptiveBlacklistTarget.sampleCount || 0) > 0) {
      lines.push(
        "新增黑目标: " +
          formatAdaptiveBlacklistSummary(latestAdaptiveBlacklistTarget, "targetId=")
      );
    }
    if (Number(latestAdaptiveBlacklistOdd.sampleCount || 0) > 0) {
      lines.push(
        "新增黑赔率: " +
          formatAdaptiveBlacklistSummary(latestAdaptiveBlacklistOdd, "odd=")
      );
    }
    if (Number(pendingFireOutcome.shotId || 0) > 0) {
      lines.push(
        "待回执: shot=" +
          String(Number(pendingFireOutcome.shotId || 0) || 0) +
          " / targetId=" +
          String(Number(pendingFireOutcome.targetId || 0) || 0) +
          " / sn=" +
          String(Number(pendingFireOutcome.targetSN || 0) || 0) +
          " / 已等待 " +
          String(Math.max(Math.ceil((Date.now() - (Number(pendingFireOutcome.firedAt || 0) || 0)) / 1000), 0)) +
          "s"
      );
    }
    if (platformWaterProfile.label) {
      lines.push(
        "放水判断: " +
          String(platformWaterProfile.label || "-") +
          " / 分 " +
          String(Number(platformWaterProfile.score || 0) || 0) +
          " / 样本 " +
          String(Number(platformWaterProfile.sampleCount || 0) || 0)
      );
      lines.push(
        "放水信号: peer命中 " +
          formatAmountValue((Number(platformWaterProfile.peerHitRate || 0) || 0) * 100) +
          "% / peer净回报 " +
          formatAmountValue((Number(platformWaterProfile.peerNetRatio || 0) || 0) * 100) +
          "% / self净回报 " +
          formatAmountValue((Number(platformWaterProfile.selfNetRatio || 0) || 0) * 100) +
          "% / 放水机制 " +
          formatAmountValue((Number(platformWaterProfile.highMechanismRate || 0) || 0) * 100) +
          "% / 吃分机制 " +
          formatAmountValue((Number(platformWaterProfile.drainMechanismRate || 0) || 0) * 100) +
          "%"
      );
      lines.push(
        "放水对齐: mode1占比 " +
          formatAmountValue((Number(platformWaterProfile.peerDesiredModeRate || 0) || 0) * 100) +
          "% / 可打样本 " +
          String(Number(platformWaterProfile.peerUsableSampleCount || 0) || 0) +
          " / 可打净回报 " +
          formatAmountValue((Number(platformWaterProfile.peerUsableNetRatio || 0) || 0) * 100) +
          "% / 错配惩罚 " +
          formatAmountValue(Number(platformWaterProfile.componentScores && platformWaterProfile.componentScores.peerAlignmentPenalty || 0) || 0)
      );
      lines.push(
        "放水构成: 特效 " +
          formatAmountValue((Number(platformWaterProfile.openFeatureRate || 0) || 0) * 100) +
          "% / 特效命中 " +
          formatAmountValue((Number(platformWaterProfile.openFeatureHitRate || 0) || 0) * 100) +
          "% / 高赔率 " +
          formatAmountValue((Number(platformWaterProfile.highOddRate || 0) || 0) * 100) +
          "% / 奖池活跃 " +
          formatAmountValue((Number(platformWaterProfile.poolFlagRate || 0) || 0) * 100) +
          "%"
      );
    }
    if (mechanismSummary.mechanismType) {
      lines.push(
        "当前机制: " +
          String(mechanismSummary.mechanismType || "-") +
          " / " +
          String(mechanismSummary.label || "-") +
          " / RTP " +
          String(mechanismSummary.rtpText || "-") +
          " / 来源 " +
          String(mechanismSummary.sourceText || "-")
      );
    }
    if (Number(lastResolvedFireOutcome.resolvedAt || 0) > 0) {
      var lastMechanismProfile = getMechanismTypeProfile(lastResolvedFireOutcome.mechanismType || "");
      lines.push(
        "最近结算: " +
          ("hit" === String(lastResolvedFireOutcome.outcome || "") ? "命中" : "未中") +
          " / targetId=" +
          String(Number(lastResolvedFireOutcome.targetId || 0) || 0) +
          " / sn=" +
          String(Number(lastResolvedFireOutcome.targetSN || 0) || 0) +
          " / win " +
          formatMoneyFromRaw(lastResolvedFireOutcome.totalWinRaw || 0) +
          " / mech " +
          String(lastResolvedFireOutcome.mechanismType || "-") +
          " " +
          String(lastMechanismProfile.label || "")
      );
      if (lastResolvedFireOutcome.targetBindingMismatch) {
        lines.push(
          "目标审计: 绑定错位 / 期望 targetId=" +
            String(Number(lastResolvedFireOutcome.expectedTargetId || 0) || 0) +
            " sn=" +
            String(Number(lastResolvedFireOutcome.expectedTargetSN || 0) || 0) +
            " / 结算 targetId=" +
            String(Number(lastResolvedFireOutcome.resolvedTargetId || 0) || 0) +
            " sn=" +
            String(Number(lastResolvedFireOutcome.resolvedTargetSN || 0) || 0)
        );
      }
      if (
        lastResolvedFireOutcome.resolvedTargetStat &&
        Number(lastResolvedFireOutcome.resolvedTargetStat.sampleCount || 0) > 0
      ) {
        lines.push(
          "目标RTP: targetId=" +
            String(Number(lastResolvedFireOutcome.targetId || 0) || 0) +
            " / RTP " +
            formatAmountValue(
              (Number(lastResolvedFireOutcome.resolvedTargetStat.rtpRatio || 0) || 0) * 100
            ) +
            "% / 样本 " +
            String(Number(lastResolvedFireOutcome.resolvedTargetStat.sampleCount || 0) || 0)
        );
      }
    }
    if (Number(pendingFireOutcome.shotId || 0) > 0) {
      lines.push(
        "发射审计: 待回执 / shot=" +
          String(Number(pendingFireOutcome.shotId || 0) || 0) +
          " / targetId=" +
          String(Number(pendingFireOutcome.targetId || 0) || 0) +
          " / hit " +
          String(Number(pendingFireOutcome.hitProbability || 0) || 0) +
          " / score " +
          String(Number(pendingFireOutcome.candidateScore || 0) || 0)
      );
    }
    if (String(lastFireAudit.type || "")) {
      lines.push(
        "异常审计: " +
          ("native_fire_leak" === String(lastFireAudit.type || "")
            ? "疑似原生漏枪"
            : "native_fire_blocked" === String(lastFireAudit.type || "")
              ? "原生开火拦截"
            : "native_continuous_fire_active" === String(lastFireAudit.type || "")
              ? "原生连发仍活跃"
            : "native_attack_mode_drift" === String(lastFireAudit.type || "")
              ? "原生模式漂移"
            : "native_fire_blocked_recovery" === String(lastFireAudit.type || "")
              ? "原生阻塞恢复"
            : "desired_mode_sync_without_pending" === String(lastFireAudit.type || "")
              ? "目标模式已结算未记账"
            : "target_binding_mismatch" === String(lastFireAudit.type || "")
              ? "目标绑定错位"
              : String(lastFireAudit.type || "-")) +
          " / " +
          String(lastFireAudit.source || "-") +
          ("native_fire_blocked" === String(lastFireAudit.type || "") &&
          String(lastFireAudit.blockCode || "")
            ? " / code " + String(lastFireAudit.blockCode || "") +
              " / 排队 " + String(Number(lastFireAudit.selfBulletSize || 0) || 0) +
              " / 余弹 " + String(Number(lastFireAudit.remainBulletCount || 0) || 0) +
              (
                Array.isArray(lastFireAudit.recoveryActions) && lastFireAudit.recoveryActions.length
                  ? " / 动作 " + lastFireAudit.recoveryActions.join(" -> ")
                  : ""
              )
            : "") +
          ("native_fire_blocked_recovery" === String(lastFireAudit.type || "") &&
          recoveryActionText
            ? " / " + recoveryActionText
            : "")
      );
    }
    if (void 0 !== data.currentAttackModeId || data.currentAttackModeLabel) {
      lines.push(
        "攻击模式: " +
          String(data.currentAttackModeLabel || getAttackModeLabel(data.currentAttackModeId)) +
          " (" +
          String(Number(data.currentAttackModeId || 0) || 0) +
          ")"
      );
    }
    if (
      (Number(data.lastObservedSelfFireAt || 0) || 0) > 0 &&
      (Number(data.lastObservedSelfFireModeId || 0) || 0) > 0
    ) {
      lines.push(
        "真实发枪: " +
          String(
            data.lastObservedSelfFireModeLabel ||
              getAttackModeLabel(data.lastObservedSelfFireModeId)
          ) +
          " / targetId=" +
          String(Number(data.lastObservedSelfFireTargetId || 0) || 0) +
          " / sn=" +
          String(Number(data.lastObservedSelfFireTargetSN || 0) || 0)
      );
    }
    if (Array.isArray(data.recentSelfResolvedOutcomes) && data.recentSelfResolvedOutcomes.length) {
      lines.push(
        "最近真实结算: " +
          formatRecentSelfResolvedSummary(data.recentSelfResolvedOutcomes, 3)
      );
    }
    if (data.lastNativeFireBlockDetail && data.lastNativeFireBlockDetail.label) {
      lines.push(
        "原生拦截: " +
          String(data.lastNativeFireBlockDetail.label || "-") +
          " / code " +
          String(data.lastNativeFireBlockDetail.code || "-") +
          " / 排队 " +
          String(Number(data.lastNativeFireBlockDetail.selfBulletSize || 0) || 0) +
          " / 余弹 " +
          String(Number(data.lastNativeFireBlockDetail.remainBulletCount || 0) || 0)
      );
    }
    if (
      (Number(data.nativeFireRecoveryCount || 0) || 0) > 0 ||
      "native_fire_blocked_recovery" === String(lastFireAudit.type || "")
    ) {
      lines.push(
        "阻塞恢复: 次数 " +
          String(Number(data.nativeFireRecoveryCount || 0) || 0) +
          " / 动作 " +
          String(recoveryActionText || "-") +
          " / blocked " +
          String(recoveryBlockedCount || Number(data.nativeFireBlockedCount || 0) || 0)
      );
    }
    if (
      void 0 !== data.nativeFireLeakCount ||
      void 0 !== data.nativeFireBlockedCount ||
      void 0 !== data.nativeFireRecoveryCount ||
      void 0 !== data.nativeContinuousFireCount ||
      void 0 !== data.targetBindingMismatchCount ||
      void 0 !== data.roomObservedSelfResolvedCount ||
      void 0 !== data.roomUntrackedSelfResolvedCount
    ) {
      lines.push(
        "执行审计: 漏枪 " +
          String(Number(data.nativeFireLeakCount || 0) || 0) +
          " / 拦截 " +
          String(Number(data.nativeFireBlockedCount || 0) || 0) +
          " / 恢复 " +
          String(Number(data.nativeFireRecoveryCount || 0) || 0) +
          " / 连发 " +
          String(Number(data.nativeContinuousFireCount || 0) || 0) +
          " / 绑错 " +
          String(Number(data.targetBindingMismatchCount || 0) || 0) +
          " / 实结 " +
          String(Number(data.roomObservedSelfResolvedCount || 0) || 0) +
          " / 入账 " +
          String(Number(data.roomResolvedShotCount || 0) || 0) +
          " / 漏记 " +
          String(Number(data.roomUntrackedSelfResolvedCount || 0) || 0)
      );
    }
    if (void 0 !== data.weakSignalNeutralCount) {
      lines.push("弱信号计数: " + String(data.weakSignalNeutralCount || 0));
    }
    if (void 0 !== data.readyStayMs) {
      lines.push("就绪后停留: " + Math.max(Math.round((Number(data.readyStayMs || 0) || 0) / 1000), 0) + "s");
    }
    if (!(Number(data.roomScanConfirmedAt || 0) > 0) && "observe" === String(data.type || "")) {
      lines.push("扫描状态: 候选链未确认");
    }
    if (Number(data.riskCooldownUntil || 0) > Date.now()) {
      lines.push(
        "冷却剩余: " +
          String(Math.max(Math.ceil((data.riskCooldownUntil - Date.now()) / 1000), 0)) +
          "s"
      );
    }
    if ("leave_room_pending" === String(data.type || "") || Number(data.leaveDueAt || 0) > 0) {
      lines.push(
        "待退房: " +
          String(
            Math.max(
              Math.ceil(
                (
                  Number(data.leaveDueAt || 0) > 0
                    ? Math.max((Number(data.leaveDueAt || 0) || 0) - Date.now(), 0)
                    : Number(data.remainingMs || 0) || 0
                ) / 1000
              ),
              0
            )
          ) +
          "s"
      );
    } else if (
      "observe" === String(data.type || "") &&
      !data.monitorOnly &&
      Number(data.remainingMs || 0) > 0
    ) {
      lines.push(
        "观察剩余: " + String(Math.max(Math.ceil((Number(data.remainingMs || 0) || 0) / 1000), 0)) + "s"
      );
    }
    if (analysis.bestCandidate) {
      lines.push(
        "候选: " +
          getCandidateIdentityText(analysis.bestCandidate, analysis.bestCandidate.scoreInfo) +
          " / odds " +
          String(analysis.bestOddsMax || 0) +
          " / score " +
          String(analysis.bestScore || 0) +
          " / hit " +
          String(analysis.bestHitProbability || 0) +
          " / stable " +
          String(
            Number(
              analysis.bestCandidate.scoreInfo &&
                analysis.bestCandidate.scoreInfo.captureStats &&
                analysis.bestCandidate.scoreInfo.captureStats.consecutiveSeenTicks || 0
            ) || 0
          ) +
          " / probe " +
          (analysis.bestCandidate.scoreInfo && analysis.bestCandidate.scoreInfo.allowEmptyOddsProbe
            ? "yes"
            : "no")
      );
    } else {
      lines.push("候选: 暂无");
    }
    if (analysis.profitCandidate) {
      lines.push(
        "收益候选: " +
          getCandidateIdentityText(analysis.profitCandidate, analysis.profitCandidate.scoreInfo) +
          " / odds " +
          String(analysis.profitOddsMax || 0) +
          " / score " +
          String(analysis.profitScore || 0) +
          " / hit " +
          String(analysis.profitHitProbability || 0) +
          " / stable " +
          String(
            Number(
              analysis.profitCandidate.scoreInfo &&
                analysis.profitCandidate.scoreInfo.captureStats &&
                analysis.profitCandidate.scoreInfo.captureStats.consecutiveSeenTicks || 0
            ) || 0
          ) +
          " / ready " +
          (analysis.profitCandidateReady ? "yes" : "no")
      );
    }
    if (betResult.reason) {
      lines.push(
        "倍率: " +
          String(betResult.currentPaolevel || 0) +
          " -> " +
          String(betResult.desiredPaolevel || 0) +
          " / " +
          String(betResult.reason || "-")
      );
    }
    if (fireResult.reason) {
      lines.push("开火: " + String(fireResult.reason || "-"));
    }
    return lines.join("\n");
  }

  function buildPanelBadgeStyle(background, color) {
    return [
      "display:inline-flex",
      "align-items:center",
      "padding:2px 8px",
      "border-radius:999px",
      "font-size:11px",
      "font-weight:700",
      "background:" + background,
      "color:" + color,
    ].join(";");
  }

  function buildPanelMetricHtml(label, value, tone) {
    var valueColor = "#e6edf3";
    if ("danger" === tone) {
      valueColor = "#fda29b";
    } else if ("warn" === tone) {
      valueColor = "#f7b955";
    } else if ("good" === tone) {
      valueColor = "#6ce9a6";
    } else if ("accent" === tone) {
      valueColor = "#9cb7ff";
    }
    return (
      '<div style="min-width:92px;flex:1 1 92px;padding:6px 8px;border-radius:8px;background:#0b1220;border:1px solid rgba(120,140,180,0.18);">' +
      '<div style="font-size:11px;color:#98a2b3;">' + String(label || "-") + "</div>" +
      '<div style="font-size:14px;font-weight:700;color:' + valueColor + ';">' +
      String(void 0 === value || null === value || "" === value ? "-" : value) +
      "</div>" +
      "</div>"
    );
  }

  function buildPanelReasonBadgeHtml(label, tone) {
    var style = "";
    if ("danger" === tone) {
      style = buildPanelBadgeStyle("rgba(240, 68, 56, 0.18)", "#fda29b");
    } else if ("warn" === tone) {
      style = buildPanelBadgeStyle("rgba(247, 144, 9, 0.18)", "#f7b955");
    } else if ("good" === tone) {
      style = buildPanelBadgeStyle("rgba(18, 183, 106, 0.18)", "#6ce9a6");
    } else {
      style = buildPanelBadgeStyle("rgba(47, 128, 237, 0.16)", "#9cb7ff");
    }
    return '<div style="' + style + '">' + String(label || "-") + "</div>";
  }

  function getObservationTierTone(tier) {
    if ("hot" === String(tier || "")) {
      return "good";
    }
    if ("warm" === String(tier || "")) {
      return "warn";
    }
    return "accent";
  }

  function getObservationTierLabel(tier) {
    if ("hot" === String(tier || "")) {
      return "热点";
    }
    if ("warm" === String(tier || "")) {
      return "次热点";
    }
    return "常规";
  }

  function buildPanelObservationStatusHtml(status) {
    var data = pickObject(status);
    var analysis = pickObject(data.lastAnalysis);
    var config = pickObject(data.config);
    var focusCandidate = pickObject(analysis.profitCandidate || analysis.bestCandidate);
    var focusScoreInfo = pickObject(focusCandidate.scoreInfo);
    var hourInfo = getObservationHourBonus(config, Date.now());
    var targetId = Number(
      focusCandidate.tableEntityID || focusCandidate.symbolID || focusCandidate.targetId || 0
    ) || 0;
    var targetInfo = targetId > 0
      ? getObservationTargetBonus(config, targetId)
      : { tier: "", scoreBonus: 0 };
    var hourTier = String(focusScoreInfo.observationHourTier || hourInfo.tier || "");
    var hourSlot = String(
      focusScoreInfo.observationHourSlot || hourInfo.slot || getCurrentObservationHourSlot(Date.now())
    );
    var hourBonus = Number(focusScoreInfo.observationHourBonus || hourInfo.scoreBonus || 0) || 0;
    var targetTier = String(focusScoreInfo.observationTargetTier || targetInfo.tier || "");
    var targetBonus = Number(focusScoreInfo.observationTargetBonus || targetInfo.scoreBonus || 0) || 0;
    var totalBonus = hourBonus + targetBonus;
    var summaryTone = "accent";
    var summaryText = "常规观察";
    if ("hot" === hourTier && "hot" === targetTier) {
      summaryTone = "good";
      summaryText = "双热点命中";
    } else if ("hot" === hourTier || "hot" === targetTier) {
      summaryTone = "good";
      summaryText = "单热点命中";
    } else if ("warm" === hourTier || "warm" === targetTier) {
      summaryTone = "warn";
      summaryText = "次热点观察";
    }
    var hourTone = getObservationTierTone(hourTier);
    var targetTone = getObservationTierTone(targetTier);
    var focusName = String(focusCandidate.name || "").trim();
    var targetText = targetId > 0
      ? "target " + String(targetId) + (focusName ? " / " + focusName : "")
      : "暂无热点候选";
    return (
      '<div style="margin-bottom:8px;padding:8px;border-radius:8px;background:#0b1220;border:1px solid rgba(120,140,180,0.18);">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
      '<div style="font-size:12px;font-weight:700;color:#e6edf3;">热点命中状态</div>' +
      buildPanelReasonBadgeHtml(summaryText, summaryTone) +
      "</div>" +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">' +
      buildPanelMetricHtml(
        "热点时段",
        hourSlot + "点 / " + getObservationTierLabel(hourTier),
        hourTone
      ) +
      buildPanelMetricHtml(
        "热点目标",
        targetText,
        targetTone
      ) +
      buildPanelMetricHtml(
        "观察加分",
        "+" + String(totalBonus) + " (" + String(targetBonus) + "+" + String(hourBonus) + ")",
        totalBonus > 0 ? summaryTone : "accent"
      ) +
      "</div>" +
      '<div style="font-size:11px;color:#98a2b3;margin-top:6px;">时段加分: ' +
      escapePanelHtml(getObservationTierLabel(hourTier) + " / +" + String(hourBonus)) +
      " | 目标加分: " +
      escapePanelHtml(getObservationTierLabel(targetTier) + " / +" + String(targetBonus)) +
      "</div>" +
      "</div>"
    );
  }

  function escapePanelHtml(value) {
    return String(void 0 === value || null === value ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildPanelSparklineSvg(values, lineColor, options) {
    var list = Array.isArray(values) ? values.slice() : [];
    var width = Number(options && options.width || 320) || 320;
    var height = Number(options && options.height || 96) || 96;
    var stroke = String(lineColor || "#9cb7ff");
    var fill = String(options && options.fill || "rgba(156, 183, 255, 0.12)");
    var minValue = isFinite(Number(options && options.min))
      ? Number(options.min)
      : null;
    var maxValue = isFinite(Number(options && options.max))
      ? Number(options.max)
      : null;
    var baselineValue = isFinite(Number(options && options.baseline))
      ? Number(options.baseline)
      : null;
    var i = 0;
    var min = 0;
    var max = 0;
    var range = 0;
    var points = [];
    var path = "";
    var areaPath = "";
    var baselineY = null;
    if (!list.length) {
      return (
        '<svg viewBox="0 0 ' + width + " " + height + '" width="100%" height="' + height + '">' +
        '<rect x="0" y="0" width="' + width + '" height="' + height + '" rx="8" fill="rgba(11,18,32,0.35)" />' +
        '<text x="' + Math.round(width / 2) + '" y="' + Math.round(height / 2) +
        '" text-anchor="middle" fill="#98a2b3" font-size="11">暂无样本</text>' +
        "</svg>"
      );
    }
    if (null === minValue || null === maxValue) {
      min = list[0];
      max = list[0];
      for (i = 1; i < list.length; i++) {
        min = Math.min(min, list[i]);
        max = Math.max(max, list[i]);
      }
    } else {
      min = minValue;
      max = maxValue;
    }
    if (min === max) {
      min -= 1;
      max += 1;
    }
    range = max - min;
    for (i = 0; i < list.length; i++) {
      var x = list.length <= 1 ? width / 2 : (i / (list.length - 1)) * width;
      var y = height - ((list[i] - min) / range) * height;
      points.push({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
      });
    }
    path = points
      .map(function (point, index) {
        return (index ? "L" : "M") + point.x + "," + point.y;
      })
      .join(" ");
    areaPath =
      path +
      " L" +
      points[points.length - 1].x +
      "," +
      height +
      " L" +
      points[0].x +
      "," +
      height +
      " Z";
    if (null !== baselineValue) {
      baselineY = height - ((baselineValue - min) / range) * height;
      baselineY = Math.max(0, Math.min(height, baselineY));
    }
    return (
      '<svg viewBox="0 0 ' + width + " " + height + '" width="100%" height="' + height + '">' +
      '<rect x="0" y="0" width="' + width + '" height="' + height + '" rx="8" fill="rgba(11,18,32,0.26)" />' +
      (null !== baselineY
        ? '<line x1="0" y1="' + baselineY + '" x2="' + width + '" y2="' + baselineY + '" stroke="rgba(247,185,85,0.32)" stroke-dasharray="4 3" stroke-width="1" />'
        : "") +
      '<path d="' + areaPath + '" fill="' + fill + '" />' +
      '<path d="' + path + '" fill="none" stroke="' + stroke + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />' +
      '<circle cx="' + points[points.length - 1].x + '" cy="' + points[points.length - 1].y + '" r="3.4" fill="' + stroke + '" />' +
      "</svg>"
    );
  }

  function buildPanelLineChartLegendItem(color, label) {
    return (
      '<div style="display:inline-flex;align-items:center;gap:4px;color:#98a2b3;font-size:11px;">' +
      '<span style="display:inline-block;width:10px;height:2px;border-radius:999px;background:' +
      String(color || "#9cb7ff") +
      ';"></span>' +
      escapePanelHtml(label || "-") +
      "</div>"
    );
  }

  function buildPanelMultiLineSvg(seriesList, options) {
    var list = Array.isArray(seriesList) ? seriesList.filter(Boolean) : [];
    var width = Number(options && options.width || 360) || 360;
    var height = Number(options && options.height || 136) || 136;
    var minValue = isFinite(Number(options && options.min))
      ? Number(options.min)
      : null;
    var maxValue = isFinite(Number(options && options.max))
      ? Number(options.max)
      : null;
    var baselines = Array.isArray(options && options.baselines) ? options.baselines.slice() : [];
    var i = 0;
    var j = 0;
    var min = null;
    var max = null;
    var range = 0;
    var svg = "";
    if (!list.length) {
      return buildPanelSparklineSvg([], "#7cc5ff", {
        width: width,
        height: height,
      });
    }
    for (i = 0; i < list.length; i++) {
      var values = Array.isArray(list[i].values) ? list[i].values : [];
      for (j = 0; j < values.length; j++) {
        var num = Number(values[j]);
        if (!isFinite(num)) {
          continue;
        }
        if (null === min || num < min) {
          min = num;
        }
        if (null === max || num > max) {
          max = num;
        }
      }
    }
    if (null === min || null === max) {
      min = 0;
      max = 1;
    }
    if (null !== minValue) {
      min = minValue;
    }
    if (null !== maxValue) {
      max = maxValue;
    }
    if (min === max) {
      min -= 1;
      max += 1;
    }
    range = max - min;
    svg +=
      '<svg viewBox="0 0 ' + width + " " + height + '" width="100%" height="' + height + '">';
    svg +=
      '<rect x="0" y="0" width="' +
      width +
      '" height="' +
      height +
      '" rx="8" fill="rgba(11,18,32,0.26)" />';
    for (i = 0; i < baselines.length; i++) {
      var baseline = Number(baselines[i]);
      if (!isFinite(baseline)) {
        continue;
      }
      var baselineY = height - ((baseline - min) / range) * height;
      baselineY = Math.max(0, Math.min(height, baselineY));
      svg +=
        '<line x1="0" y1="' +
        baselineY +
        '" x2="' +
        width +
        '" y2="' +
        baselineY +
        '" stroke="rgba(247,185,85,0.24)" stroke-dasharray="4 3" stroke-width="1" />';
    }
    for (j = 1; j <= 3; j++) {
      var gridY = Math.round((height / 4) * j * 10) / 10;
      svg +=
        '<line x1="0" y1="' +
        gridY +
        '" x2="' +
        width +
        '" y2="' +
        gridY +
        '" stroke="rgba(120,140,180,0.12)" stroke-width="1" />';
    }
    for (i = 0; i < list.length; i++) {
      var series = list[i];
      var points = [];
      var path = "";
      var valueList = Array.isArray(series.values) ? series.values : [];
      for (j = 0; j < valueList.length; j++) {
        var val = Number(valueList[j]);
        if (!isFinite(val)) {
          continue;
        }
        var x = valueList.length <= 1 ? width / 2 : (j / (valueList.length - 1)) * width;
        var y = height - ((val - min) / range) * height;
        points.push({
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
        });
      }
      if (!points.length) {
        continue;
      }
      path = points
        .map(function (point, index) {
          return (index ? "L" : "M") + point.x + "," + point.y;
        })
        .join(" ");
      svg +=
        '<path d="' +
        path +
        '" fill="none" stroke="' +
        String(series.color || "#9cb7ff") +
        '" stroke-width="' +
        String(Number(series.strokeWidth || 2) || 2) +
        '" stroke-linecap="round" stroke-linejoin="round" opacity="' +
        String(
          isFinite(Number(series.opacity)) ? Number(series.opacity) : 1
        ) +
        '" />';
      svg +=
        '<circle cx="' +
        points[points.length - 1].x +
        '" cy="' +
        points[points.length - 1].y +
        '" r="2.8" fill="' +
        String(series.color || "#9cb7ff") +
        '" />';
    }
    svg += "</svg>";
    return svg;
  }

  function buildPanelWaterTrendMetricHtml(label, valueText, svgHtml, tone) {
    var borderColor = "rgba(120,140,180,0.18)";
    var valueColor = "#e6edf3";
    if ("danger" === tone) {
      borderColor = "rgba(240,68,56,0.22)";
      valueColor = "#fda29b";
    } else if ("warn" === tone) {
      borderColor = "rgba(247,144,9,0.24)";
      valueColor = "#f7b955";
    } else if ("good" === tone) {
      borderColor = "rgba(18,183,106,0.24)";
      valueColor = "#6ce9a6";
    } else if ("accent" === tone) {
      borderColor = "rgba(47,128,237,0.22)";
      valueColor = "#9cb7ff";
    }
    return (
      '<div style="flex:1 1 96px;min-width:96px;padding:8px;border-radius:8px;background:#0b1220;border:1px solid ' +
      borderColor +
      ';">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;">' +
      '<div style="font-size:11px;color:#98a2b3;">' + String(label || "-") + "</div>" +
      '<div style="font-size:12px;font-weight:700;color:' + valueColor + ';">' +
      String(valueText || "-") +
      "</div>" +
      "</div>" +
      svgHtml +
      "</div>"
    );
  }

  function buildPanelDecisionGateItemHtml(label, currentText, targetText, pass, toneOverride) {
    var tone = toneOverride || (pass ? "good" : "warn");
    var borderColor = "rgba(120,140,180,0.18)";
    var bgColor = "rgba(11,18,32,0.72)";
    var valueColor = "#e6edf3";
    var badgeBg = "rgba(47,128,237,0.16)";
    var badgeColor = "#9cb7ff";
    if ("danger" === tone) {
      borderColor = "rgba(240,68,56,0.24)";
      bgColor = "rgba(42,16,20,0.5)";
      valueColor = "#fda29b";
      badgeBg = "rgba(240,68,56,0.18)";
      badgeColor = "#fda29b";
    } else if ("warn" === tone) {
      borderColor = "rgba(247,144,9,0.24)";
      bgColor = "rgba(42,30,10,0.42)";
      valueColor = "#f7b955";
      badgeBg = "rgba(247,144,9,0.18)";
      badgeColor = "#f7b955";
    } else if ("good" === tone) {
      borderColor = "rgba(18,183,106,0.24)";
      bgColor = "rgba(10,34,22,0.42)";
      valueColor = "#6ce9a6";
      badgeBg = "rgba(18,183,106,0.18)";
      badgeColor = "#6ce9a6";
    }
    return (
      '<div style="flex:1 1 180px;min-width:180px;padding:8px;border-radius:8px;background:' +
      bgColor +
      ';border:1px solid ' +
      borderColor +
      ';">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
      '<div style="font-size:11px;color:#98a2b3;">' +
      escapePanelHtml(label || "-") +
      "</div>" +
      '<div style="padding:2px 6px;border-radius:999px;background:' +
      badgeBg +
      ";color:" +
      badgeColor +
      ';font-size:10px;font-weight:700;">' +
      (pass ? "通过" : "未过") +
      "</div>" +
      "</div>" +
      '<div style="font-size:12px;font-weight:700;color:' +
      valueColor +
      ';margin-top:6px;">' +
      escapePanelHtml(currentText || "-") +
      "</div>" +
      '<div style="font-size:11px;color:#98a2b3;margin-top:4px;">目标: ' +
      escapePanelHtml(targetText || "-") +
      "</div>" +
      "</div>"
    );
  }

  function buildPanelDecisionExplainHtml(status) {
    var data = pickObject(status);
    var analysis = pickObject(data.lastAnalysis);
    var profile = pickObject(data.platformWaterProfile);
    var waterActionGuard = pickObject(data.platformWaterActionGuard);
    var lastDecision = pickObject(data.lastDecision);
    var lastDesired = pickObject(data.lastDesired);
    var config = pickObject(data.config);
    var combatPolicy = pickObject(lastDesired.combatPolicy);
    if (!Object.keys(combatPolicy).length) {
      combatPolicy = {
        allowCombat: !!lastDecision.combatPolicyAllowCombat,
        probeOnly: !!lastDecision.combatPolicyProbeOnly,
        level: String(lastDecision.combatPolicyLevel || ""),
        reason: String(lastDecision.combatPolicyReason || ""),
      };
    }
    var profitCandidate = pickObject(analysis.profitCandidate || analysis.bestCandidate);
    var profitScoreInfo = pickObject(profitCandidate.scoreInfo);
    var captureStats = pickObject(profitScoreInfo.captureStats);
    var candidateScore = Number(analysis.profitScore || 0) || 0;
    if (!(candidateScore > 0)) {
      candidateScore = Number(profitScoreInfo.score || captureStats.score || 0) || 0;
    }
    var hitProbability = Number(analysis.profitHitProbability || 0) || 0;
    if (!(hitProbability > 0)) {
      hitProbability = Number(profitScoreInfo.hitProbability || captureStats.hitProbability || 0) || 0;
    }
    var stableSeenTicks = Number(captureStats.consecutiveSeenTicks || 0) || 0;
    var minStableSeenTicks = Math.max(toInt(config.minStableSeenTicks, 1), 1);
    var minHitProbability = Math.max(toNumber(config.minHitProbability, 56), 1);
    var minCandidateScore = Math.max(toNumber(config.minCandidateScore, 40), 1);
    var roomProfitRaw = Number(data.roomProfitRaw || 0) || 0;
    var roomResolvedShotCount = Number(data.roomResolvedShotCount || 0) || 0;
    var roomResolvedHitCount = Number(data.roomResolvedHitCount || 0) || 0;
    var platformItems = [];
    var combatItems = [];
    var candidateReady = !!analysis.profitCandidateReady && !!analysis.profitCandidate;
    var aimReady = !(Number(data.aimReadyAt || 0) > Date.now());
    var scaleupReady = !!(
      waterActionGuard.directFireReady &&
      roomResolvedShotCount >= Math.max(toInt(config.rampMinResolvedShotsBeforeScaleUp, 2), 1) &&
      roomResolvedHitCount >= Math.max(toInt(config.rampMinResolvedHitsBeforeScaleUp, 1), 1) &&
      roomProfitRaw >= Math.max(toNumber(config.rampMinRoomProfitRawBeforeScaleUp, 0), 0)
    );
    platformItems.push(
      buildPanelDecisionGateItemHtml(
        "正向结构",
        waterActionGuard.positiveStructureReady ? "已成立" : "未成立",
        "需要正向结构信号",
        !!waterActionGuard.positiveStructureReady,
        waterActionGuard.positiveStructureReady ? "good" : "warn"
      )
    );
    platformItems.push(
      buildPanelDecisionGateItemHtml(
        "放水分",
        String(Number(profile.score || 0) || 0),
        ">=" + String(Number(waterActionGuard.minDirectFireWaterScore || 0) || 0),
        (Number(profile.score || 0) || 0) >= (Number(waterActionGuard.minDirectFireWaterScore || 0) || 0),
        (Number(profile.score || 0) || 0) >= (Number(waterActionGuard.minDirectFireWaterScore || 0) || 0) ? "good" : "warn"
      )
    );
    platformItems.push(
      buildPanelDecisionGateItemHtml(
        "高赔率占比",
        formatAmountValue((Number(profile.highOddRate || 0) || 0) * 100) + "%",
        ">=" + formatAmountValue((Number(waterActionGuard.minDirectFireHighOddRate || 0) || 0) * 100) + "%",
        (Number(profile.highOddRate || 0) || 0) >= (Number(waterActionGuard.minDirectFireHighOddRate || 0) || 0),
        (Number(profile.highOddRate || 0) || 0) >= (Number(waterActionGuard.minDirectFireHighOddRate || 0) || 0) ? "good" : "warn"
      )
    );
    platformItems.push(
      buildPanelDecisionGateItemHtml(
        "可打净回报",
        formatAmountValue((Number(waterActionGuard.usablePeerNetRatio || 0) || 0) * 100) + "%",
        ">=" + formatAmountValue((Number(waterActionGuard.minDirectFirePeerNetRatio || 0) || 0) * 100) + "%",
        (Number(waterActionGuard.usablePeerNetRatio || 0) || 0) >= (Number(waterActionGuard.minDirectFirePeerNetRatio || 0) || 0),
        (Number(waterActionGuard.usablePeerNetRatio || 0) || 0) >= (Number(waterActionGuard.minDirectFirePeerNetRatio || 0) || 0) ? "good" : "warn"
      )
    );
    platformItems.push(
      buildPanelDecisionGateItemHtml(
        "吃分机制率",
        formatAmountValue((Number(waterActionGuard.drainMechanismRate || 0) || 0) * 100) + "%",
        "<=" + formatAmountValue((Number(waterActionGuard.maxDirectFireDrainMechanismRate || 0) || 0) * 100) + "%",
        (Number(waterActionGuard.drainMechanismRate || 0) || 0) <= (Number(waterActionGuard.maxDirectFireDrainMechanismRate || 0) || 0),
        (Number(waterActionGuard.drainMechanismRate || 0) || 0) <= (Number(waterActionGuard.maxDirectFireDrainMechanismRate || 0) || 0) ? "good" : "danger"
      )
    );
    platformItems.push(
      buildPanelDecisionGateItemHtml(
        "本房盈亏",
        formatMoneyFromRaw(roomProfitRaw),
        ">=" + formatMoneyFromRaw(-(Number(waterActionGuard.maxDirectFireRoomLossRaw || 0) || 0)),
        roomProfitRaw >= -(Number(waterActionGuard.maxDirectFireRoomLossRaw || 0) || 0),
        roomProfitRaw >= -(Number(waterActionGuard.maxDirectFireRoomLossRaw || 0) || 0) ? "good" : "warn"
      )
    );
    combatItems.push(
      buildPanelDecisionGateItemHtml(
        "利润候选",
        candidateReady ? "已就绪" : "未就绪",
        "需要利润候选",
        candidateReady,
        candidateReady ? "good" : "warn"
      )
    );
    combatItems.push(
      buildPanelDecisionGateItemHtml(
        "候选分",
        formatAmountValue(candidateScore),
        ">=" + formatAmountValue(minCandidateScore),
        candidateScore >= minCandidateScore,
        candidateScore >= minCandidateScore ? "good" : "warn"
      )
    );
    combatItems.push(
      buildPanelDecisionGateItemHtml(
        "命中率",
        formatAmountValue(hitProbability),
        ">=" + formatAmountValue(minHitProbability),
        hitProbability >= minHitProbability,
        hitProbability >= minHitProbability ? "good" : "warn"
      )
    );
    combatItems.push(
      buildPanelDecisionGateItemHtml(
        "稳定帧",
        String(stableSeenTicks),
        ">=" + String(minStableSeenTicks),
        stableSeenTicks >= minStableSeenTicks,
        stableSeenTicks >= minStableSeenTicks ? "good" : "warn"
      )
    );
    combatItems.push(
      buildPanelDecisionGateItemHtml(
        "AIM状态",
        aimReady ? "已就绪" : "预热中",
        "需要就绪",
        aimReady,
        aimReady ? "good" : "warn"
      )
    );
    combatItems.push(
      buildPanelDecisionGateItemHtml(
        "放大炮资格",
        scaleupReady ? "允许放大" : "保持最小炮",
        "需样本/命中/房盈亏同时通过",
        scaleupReady,
        scaleupReady ? "good" : "accent"
      )
    );
    return (
      '<div style="margin-bottom:8px;padding:8px;border-radius:8px;background:#0b1220;border:1px solid rgba(120,140,180,0.18);">' +
      '<div style="font-size:12px;font-weight:700;color:#e6edf3;">发枪原因拆解</div>' +
      '<div style="font-size:11px;color:#98a2b3;margin-top:4px;">当前结论: ' +
      escapePanelHtml(getCombatPolicyLabel(combatPolicy) + " / " + getCombatPolicyReasonText(combatPolicy.reason)) +
      "</div>" +
      '<div style="font-size:11px;color:#98a2b3;margin-top:2px;">先过平台，再过候选和执行门槛；未过项就是当前不给打的直接原因。</div>' +
      '<div style="font-size:11px;color:#98a2b3;margin-top:8px;margin-bottom:6px;">平台直开门槛</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
      platformItems.join("") +
      "</div>" +
      '<div style="font-size:11px;color:#98a2b3;margin-top:8px;margin-bottom:6px;">候选与执行门槛</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
      combatItems.join("") +
      "</div>" +
      "</div>"
    );
  }

  function buildPanelResolvedReplayTableHtml(entries) {
    var list = Array.isArray(entries) ? entries.slice() : [];
    var rows = [];
    var i = 0;
    if (!list.length) {
      return (
        '<div style="padding:10px;border-radius:8px;background:#0b1220;border:1px solid rgba(120,140,180,0.18);font-size:11px;color:#98a2b3;">暂无真实结算回放</div>'
      );
    }
    for (i = list.length - 1; i >= 0; i--) {
      var item = pickObject(list[i]);
      var netRaw = (Number(item.totalWinRaw || 0) || 0) - (Number(item.betRaw || 0) || 0);
      var netColor = netRaw > 0 ? "#6ce9a6" : netRaw < 0 ? "#fda29b" : "#9cb7ff";
      var oddText = Number(item.oddRaw || 0) > 0 ? String(Number(item.oddRaw || 0) || 0) : "-";
      rows.push(
        "<tr>" +
        '<td style="padding:5px 6px;color:#98a2b3;">' + escapePanelHtml(formatConsoleTimestamp(item.ts || 0)) + "</td>" +
        '<td style="padding:5px 6px;color:#e6edf3;">' + escapePanelHtml(Number(item.targetId || 0) > 0 ? "T" + String(Number(item.targetId || 0) || 0) : "-") + "</td>" +
        '<td style="padding:5px 6px;color:#e6edf3;">' + escapePanelHtml(oddText) + "</td>" +
        '<td style="padding:5px 6px;color:#98a2b3;">' + escapePanelHtml(String(item.mechanismType || "-")) + "</td>" +
        '<td style="padding:5px 6px;color:#98a2b3;">' + escapePanelHtml(String(item.fireModeLabel || "-")) + "</td>" +
        '<td style="padding:5px 6px;color:#e6edf3;">' + escapePanelHtml(formatMoneyFromRaw(item.betRaw || 0)) + "</td>" +
        '<td style="padding:5px 6px;color:#e6edf3;">' + escapePanelHtml(formatMoneyFromRaw(item.totalWinRaw || 0)) + "</td>" +
        '<td style="padding:5px 6px;font-weight:700;color:' + netColor + ';">' + escapePanelHtml(formatMoneyFromRaw(netRaw)) + "</td>" +
        "</tr>"
      );
    }
    return (
      '<div style="max-height:156px;overflow:auto;border-radius:8px;border:1px solid rgba(120,140,180,0.18);background:#0b1220;">' +
      '<table style="width:100%;border-collapse:collapse;font-size:11px;">' +
      "<thead>" +
      '<tr style="position:sticky;top:0;background:#111a2b;">' +
      '<th style="padding:6px;color:#98a2b3;text-align:left;">时间</th>' +
      '<th style="padding:6px;color:#98a2b3;text-align:left;">目标</th>' +
      '<th style="padding:6px;color:#98a2b3;text-align:left;">赔率</th>' +
      '<th style="padding:6px;color:#98a2b3;text-align:left;">机制</th>' +
      '<th style="padding:6px;color:#98a2b3;text-align:left;">模式</th>' +
      '<th style="padding:6px;color:#98a2b3;text-align:left;">下注</th>' +
      '<th style="padding:6px;color:#98a2b3;text-align:left;">返奖</th>' +
      '<th style="padding:6px;color:#98a2b3;text-align:left;">净值</th>' +
      "</tr>" +
      "</thead>" +
      "<tbody>" +
      rows.join("") +
      "</tbody>" +
      "</table>" +
      "</div>"
    );
  }

  function buildPanelWaterTrendHtml(status) {
    var data = pickObject(status);
    var profile = pickObject(data.platformWaterProfile);
    var waterActionGuard = pickObject(data.platformWaterActionGuard);
    var lastDecision = pickObject(data.lastDecision);
    var lastDesired = pickObject(data.lastDesired);
    var combatPolicy = pickObject(lastDesired.combatPolicy);
    if (!Object.keys(combatPolicy).length) {
      combatPolicy = {
        allowCombat: !!lastDecision.combatPolicyAllowCombat,
        probeOnly: !!lastDecision.combatPolicyProbeOnly,
        level: String(lastDecision.combatPolicyLevel || ""),
        reason: String(lastDecision.combatPolicyReason || ""),
      };
    }
    var history = Array.isArray(data.platformWaterTrendHistory)
      ? data.platformWaterTrendHistory.slice()
      : [];
    var recentResolved = Array.isArray(data.recentSelfResolvedOutcomes)
      ? data.recentSelfResolvedOutcomes.slice(-8)
      : [];
    var latest = history.length ? history[history.length - 1] : null;
    var scoreValues = history.map(function (item) {
      return Number(item && item.score || 0) || 0;
    });
    var usablePeerNetValues = history.map(function (item) {
      return (Number(item && item.peerUsableNetRatio || 0) || 0) * 100;
    });
    var desiredModeValues = history.map(function (item) {
      return (Number(item && item.peerDesiredModeRate || 0) || 0) * 100;
    });
    var selfNetValues = history.map(function (item) {
      return (Number(item && item.selfNetRatio || 0) || 0) * 100;
    });
    var highMechanismValues = history.map(function (item) {
      return (Number(item && item.highMechanismRate || 0) || 0) * 100;
    });
    var latestLabel = String((latest && latest.label) || profile.label || "未采样");
    var latestScore = Number((latest && latest.score) || profile.score || 0) || 0;
    var latestUsablePeerNet = Number(
      (latest && latest.peerUsableNetRatio) || profile.peerUsableNetRatio || 0
    ) || 0;
    var latestDesiredModeRate = Number(
      (latest && latest.peerDesiredModeRate) || profile.peerDesiredModeRate || 0
    ) || 0;
    var latestHighMechanismRate = Number(
      (latest && latest.highMechanismRate) || profile.highMechanismRate || 0
    ) || 0;
    var latestSampleCount = Number((latest && latest.sampleCount) || profile.sampleCount || 0) || 0;
    var scoreTone = latestScore >= 56 ? "good" : latestScore >= 34 ? "warn" : "accent";
    var usablePeerNetTone =
      latestUsablePeerNet > 0 ? "good" : latestUsablePeerNet < -0.05 ? "danger" : "accent";
    var desiredModeTone = latestDesiredModeRate >= 0.35 ? "good" : "warn";
    var highMechanismTone =
      latestHighMechanismRate >= 0.08 ? "good" : latestHighMechanismRate >= 0.04 ? "warn" : "accent";
    var latestSelfNet = Number((latest && latest.selfNetRatio) || profile.selfNetRatio || 0) || 0;
    var selfNetTone = latestSelfNet > 0 ? "good" : latestSelfNet < -0.05 ? "danger" : "accent";
    var historyHint = history.length
      ? "近" + String(history.length) + "个样本点 / 房内实时刷新"
      : "等待房内结算样本生成曲线";
    var guardLabel = getPlatformWaterGuardLabel(waterActionGuard);
    var guardTone = getPlatformWaterGuardTone(waterActionGuard);
    var guardReasonText = getPlatformWaterGuardReasonText(waterActionGuard.blockReason);
    var guardRecoveryText = getPlatformWaterGuardRecoveryText(waterActionGuard, 3);
    var combatLabel = getCombatPolicyLabel(combatPolicy);
    var combatTone = getCombatPolicyTone(combatPolicy);
    var combatReasonText = getCombatPolicyReasonText(combatPolicy.reason);
    var guardMetaText =
      "吃分 " +
      String(Number(waterActionGuard.recentDrainCount || 0) || 0) +
      " / 连续 " +
      String(Number(waterActionGuard.recentDrainStreak || 0) || 0) +
      " / 亏损簇 " +
      String(Number(waterActionGuard.recentDrainLossCount || 0) || 0);
    var decisionExplainHtml = buildPanelDecisionExplainHtml(status);
    var observationStatusHtml = buildPanelObservationStatusHtml(status);
    var overviewChartHtml = buildPanelMultiLineSvg(
      [
        { label: "放水分", color: "#7cc5ff", values: scoreValues, strokeWidth: 2.4 },
        { label: "可打净回报%", color: "#6ce9a6", values: usablePeerNetValues, strokeWidth: 2.2 },
        { label: "自身净回报%", color: "#c084fc", values: selfNetValues, strokeWidth: 2.2 },
        { label: "放水机制率%", color: "#fda29b", values: highMechanismValues, strokeWidth: 2.1 },
      ],
      {
        width: 392,
        height: 138,
        min: -40,
        max: 100,
        baselines: [0, 35, 56],
      }
    );
    return (
      '<div style="margin-bottom:8px;padding:8px;border-radius:8px;background:rgba(11,18,32,0.72);border:1px solid rgba(120,140,180,0.22);" data-role="panel-water-trend-content">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
      '<div>' +
      '<div style="font-size:12px;font-weight:700;color:#e6edf3;">放水实时曲线</div>' +
      '<div style="font-size:11px;color:#98a2b3;margin-top:2px;">' +
      historyHint +
      "</div>" +
      "</div>" +
      '<div style="' +
      buildPanelBadgeStyle(
        "open_suspected" === String(profile.level || "")
          ? "rgba(18, 183, 106, 0.18)"
          : "warming" === String(profile.level || "")
            ? "rgba(247, 144, 9, 0.18)"
            : "rgba(47, 128, 237, 0.16)",
        "open_suspected" === String(profile.level || "")
          ? "#6ce9a6"
          : "warming" === String(profile.level || "")
            ? "#f7b955"
            : "#9cb7ff"
      ) +
      '">' +
      latestLabel +
      "</div>" +
      "</div>" +
      '<div style="margin-bottom:8px;">' +
      overviewChartHtml +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">' +
      buildPanelLineChartLegendItem("#7cc5ff", "放水分") +
      buildPanelLineChartLegendItem("#6ce9a6", "同屏可打净回报%") +
      buildPanelLineChartLegendItem("#c084fc", "自身净回报%") +
      buildPanelLineChartLegendItem("#fda29b", "放水机制率%") +
      '<div style="display:inline-flex;align-items:center;gap:4px;color:#98a2b3;font-size:11px;">阈值线: 0 / 35 / 56</div>' +
      "</div>" +
      "</div>" +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
      buildPanelWaterTrendMetricHtml(
        "平台资格",
        guardLabel,
        buildPanelSparklineSvg(
          [
            Number(waterActionGuard.hardBlocked ? -1 : 0),
            Number(waterActionGuard.directFireReady ? 1 : 0),
            Number(waterActionGuard.recentDrainStreak || 0) || 0,
          ],
          "danger" === guardTone ? "#fda29b" : "good" === guardTone ? "#6ce9a6" : "#f7b955",
          {
            width: 92,
            height: 34,
            min: -1,
            max: 3,
            baseline: 0,
            fill: "danger" === guardTone
              ? "rgba(253,162,155,0.12)"
              : "good" === guardTone
                ? "rgba(108,233,166,0.12)"
                : "rgba(247,185,85,0.12)",
          }
        ),
        guardTone
      ) +
      buildPanelWaterTrendMetricHtml(
        "实战资格",
        combatLabel,
        buildPanelSparklineSvg(
          [
            Number(combatPolicy.allowCombat ? 1 : 0),
            Number(combatPolicy.probeOnly ? 0.5 : 0),
            Number(waterActionGuard.directFireReady ? 1 : 0),
          ],
          "danger" === combatTone ? "#fda29b" : "good" === combatTone ? "#6ce9a6" : "#f7b955",
          {
            width: 92,
            height: 34,
            min: 0,
            max: 1,
            baseline: 0.5,
            fill: "danger" === combatTone
              ? "rgba(253,162,155,0.12)"
              : "good" === combatTone
                ? "rgba(108,233,166,0.12)"
                : "rgba(247,185,85,0.12)",
          }
        ),
        combatTone
      ) +
      buildPanelWaterTrendMetricHtml(
        "放水分",
        String(latestScore),
        buildPanelSparklineSvg(scoreValues, "#7cc5ff", {
          width: 92,
          height: 34,
          min: 0,
          max: 100,
          baseline: 56,
          fill: "rgba(124,197,255,0.12)",
        }),
        scoreTone
      ) +
      buildPanelWaterTrendMetricHtml(
        "可打净回报",
        formatAmountValue(latestUsablePeerNet * 100) + "%",
        buildPanelSparklineSvg(usablePeerNetValues, "#6ce9a6", {
          width: 92,
          height: 34,
          min: -20,
          max: 20,
          baseline: 0,
          fill: "rgba(108,233,166,0.12)",
        }),
        usablePeerNetTone
      ) +
      buildPanelWaterTrendMetricHtml(
        "自身净回报",
        formatAmountValue(latestSelfNet * 100) + "%",
        buildPanelSparklineSvg(selfNetValues, "#c084fc", {
          width: 92,
          height: 34,
          min: -20,
          max: 20,
          baseline: 0,
          fill: "rgba(192,132,252,0.12)",
        }),
        selfNetTone
      ) +
      buildPanelWaterTrendMetricHtml(
        "mode1占比",
        formatAmountValue(latestDesiredModeRate * 100) + "%",
        buildPanelSparklineSvg(desiredModeValues, "#9cb7ff", {
          width: 92,
          height: 34,
          min: 0,
          max: 100,
          baseline: 35,
          fill: "rgba(156,183,255,0.12)",
        }),
        desiredModeTone
      ) +
      buildPanelWaterTrendMetricHtml(
        "放水机制率",
        formatAmountValue(latestHighMechanismRate * 100) + "%",
        buildPanelSparklineSvg(highMechanismValues, "#fda29b", {
          width: 92,
          height: 34,
          min: 0,
          max: 60,
          baseline: 18,
          fill: "rgba(253,162,155,0.12)",
        }),
        highMechanismTone
      ) +
      "</div>" +
      '<div style="margin-top:8px;padding:8px;border-radius:8px;background:#0b1220;border:1px solid rgba(120,140,180,0.18);">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">' +
      buildPanelReasonBadgeHtml(
        guardLabel,
        guardTone
      ) +
      '<div style="font-size:11px;color:#98a2b3;">' +
      escapePanelHtml(guardMetaText) +
      "</div>" +
      "</div>" +
      '<div style="font-size:11px;color:' +
      ("danger" === guardTone ? "#fda29b" : "good" === guardTone ? "#6ce9a6" : "#f7b955") +
      ';">' +
      escapePanelHtml("danger" === guardTone ? guardReasonText : waterActionGuard.directFireReady ? "当前允许直开，仍需命中候选条件。" : "当前只允许做房态过滤，不直接给开火绿灯。") +
      "</div>" +
      '<div style="font-size:11px;color:#98a2b3;margin-top:4px;">解除条件: ' +
      escapePanelHtml(guardRecoveryText) +
      "</div>" +
      '<div style="font-size:11px;color:#98a2b3;margin-top:4px;">实战门槛: ' +
      escapePanelHtml(combatLabel + " / " + combatReasonText) +
      "</div>" +
      "</div>" +
      '<div style="margin-top:8px;">' +
      observationStatusHtml +
      "</div>" +
      '<div style="margin-top:8px;">' +
      decisionExplainHtml +
      "</div>" +
      '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:11px;color:#98a2b3;">' +
      '<span>样本 ' + String(latestSampleCount) + "</span>" +
      '<span>最近更新时间 ' + formatConsoleTimestamp((latest && latest.ts) || Date.now()) + "</span>" +
      '<span>真实回放 ' + String(recentResolved.length) + "</span>" +
      "</div>" +
      '<div style="margin-top:8px;">' +
      '<div style="font-size:11px;color:#98a2b3;margin-bottom:6px;">最近真实结算回放</div>' +
      buildPanelResolvedReplayTableHtml(recentResolved) +
      "</div>" +
      "</div>"
    );
  }

  function getDecisionReasonBadges(status) {
    var data = pickObject(status);
    var decision = pickObject(data.lastDecision);
    var roomStatus = pickObject(data.lastRoomStatus);
    var analysis = pickObject(data.lastAnalysis);
    var stopLossState = pickObject(data.stopLossState);
    var platformWaterProfile = pickObject(data.platformWaterProfile);
    var platformWaterActionGuard = pickObject(data.platformWaterActionGuard);
    var lastFireAudit = pickObject(data.lastFireAudit);
    var result = [];
    var reason = String(decision.reason || "");
    var type = String(decision.type || "");

    if (data.stopLatched || stopLossState.hit) {
      result.push({ label: "止损锁定", tone: "danger" });
    }
    if (stopLossState.takeProfitHit || "take_profit_triggered" === type) {
      result.push({ label: "止盈锁定", tone: "good" });
    }
    if ("leave_room_pending" === type) {
      result.push({ label: "待退出", tone: "warn" });
    }
    if ("waiting_runtime" === type || "native_runtime_not_ready" === reason) {
      result.push({ label: "主包未就绪", tone: "danger" });
    }
    if ("join_room" === type || "join_room_bootstrap" === type || "join_cooldown" === type) {
      result.push({ label: "自动进房中", tone: "accent" });
    }
    if ("waiting_post_leave_rejoin" === reason) {
      result.push({ label: "退房后缓进小房", tone: "accent" });
    }
    if ("waiting_scene" === type || "bootstrap_join_from_unknown" === reason) {
      result.push({ label: "场景识别中", tone: "warn" });
    }
    if ("room_loading" === type || "room_ui_not_ready" === reason) {
      result.push({ label: "房间加载中", tone: "warn" });
    }
    if ("room_warmup" === type || "room_runtime_warming" === reason) {
      result.push({ label: "房间预热中", tone: "accent" });
    }
    if ("scan_unconfirmed_waiting" === reason) {
      result.push({ label: "候选链未确认", tone: "warn" });
    }
    if ("waiting_platform_water_sample" === reason) {
      result.push({ label: "放水采样中", tone: "accent" });
    }
    if ("waiting_platform_water_warmup" === reason) {
      result.push({ label: "房态未升温", tone: "warn" });
    }
    if ("waiting_platform_direct_fire_window" === reason) {
      result.push({ label: "未达直开线", tone: "warn" });
    }
    if ("platform_water_probe_ready" === reason) {
      result.push({ label: "样本到位可试探", tone: "good" });
    }
    if ("platform_water_normal_probe" === reason) {
      result.push({ label: "常态强信号试探", tone: "good" });
    }
    if ("platform_water_special_event_probe" === reason) {
      result.push({ label: "特殊事件试探", tone: "good" });
    }
    if ("platform_water_special_event_bypass" === reason) {
      result.push({ label: "事件窗口放行", tone: "good" });
    }
    if ("post_hit_followup_target_lost" === reason) {
      result.push({ label: "追击目标失配", tone: "warn" });
    }
    if ("waiting_platform_peer_recovery" === reason) {
      result.push({ label: "同屏回报偏冷", tone: "warn" });
    }
    if ("waiting_self_recovery" === reason || "waiting_self_room_recovery" === reason) {
      result.push({ label: "自身回报偏冷", tone: "danger" });
    }
    if ("waiting_self_cold_peer_hot" === reason) {
      result.push({ label: "同热自冷阻断", tone: "danger" });
    }
    if ("self_loss_streak_precision_probe" === reason) {
      result.push({ label: "连空窄窗验证", tone: "good" });
    }
    if ("waiting_self_mechanism_recovery" === reason) {
      result.push({ label: "当前机制吃分", tone: "danger" });
    }
    if (platformWaterActionGuard.hardBlocked || "blocked_drain_mechanism" === reason) {
      result.push({ label: "吃分红灯", tone: "danger" });
    } else if (!platformWaterActionGuard.directFireReady) {
      result.push({ label: "仅做房态过滤", tone: "warn" });
    } else {
      result.push({ label: "允许直开", tone: "good" });
    }
    if ("miss_streak_leave_room" === reason) {
      result.push({ label: "连空切房", tone: "danger" });
    }
    if ("precision_empty_block_leave_room" === reason) {
      result.push({ label: "空赔率阻塞切房", tone: "warn" });
    }
    if ("blocked_dead_room_leave_room" === reason) {
      result.push({ label: "执行死房切房", tone: "danger" });
    }
    if (data.monitorOnly || "monitor_only" === type || "listen_only_candidate_observed" === reason || "listen_only_observing" === reason) {
      result.push({ label: "监听模式", tone: "accent" });
    }
    if ("open_suspected" === String(platformWaterProfile.level || "")) {
      result.push({ label: "疑似放水", tone: "good" });
    } else if ("warming" === String(platformWaterProfile.level || "")) {
      result.push({ label: "放水升温", tone: "accent" });
    } else if ("insufficient" === String(platformWaterProfile.level || "")) {
      result.push({ label: "放水样本不足", tone: "warn" });
    }
    if ("observe" === type || "waiting_high_value_target" === reason) {
      result.push({ label: "候选不足", tone: "warn" });
    }
    if ("attack_waiting" === type || "aim_mode_warming" === reason) {
      result.push({ label: "AIM预热中", tone: "accent" });
    }
    if ("native_fire_blocked" === reason) {
      result.push({ label: "原生开火拦截", tone: "danger" });
    }
    if ("native_continuous_fire_active" === reason) {
      result.push({ label: "原生连发仍活跃", tone: "danger" });
    }
    if ("native_attack_mode_drift" === reason) {
      result.push({ label: "原生模式漂移", tone: "danger" });
    }
    if ("fire_safe_bet_syncing" === reason || "fire_safe_bet_guarded" === reason) {
      result.push({ label: "安全炮档降挡", tone: "warn" });
    }
    if ((Number(platformWaterProfile.componentScores && platformWaterProfile.componentScores.peerAlignmentPenalty || 0) || 0) >= 12) {
      result.push({ label: "热度错配", tone: "warn" });
    }
    if ("native_fire_leak" === String(lastFireAudit.type || "")) {
      result.push({ label: "疑似原生漏枪", tone: "danger" });
    }
    if ("native_continuous_fire_active" === String(lastFireAudit.type || "")) {
      result.push({ label: "原生连发活跃", tone: "danger" });
    }
    if ("native_attack_mode_drift" === String(lastFireAudit.type || "")) {
      result.push({ label: "原生模式漂移", tone: "danger" });
    }
    if ("native_fire_blocked_recovery" === String(lastFireAudit.type || "")) {
      result.push({ label: "原生阻塞恢复", tone: "warn" });
    }
    if ("desired_mode_sync_without_pending" === String(lastFireAudit.type || "")) {
      result.push({ label: "真实结算未记账", tone: "danger" });
    }
    if ("target_binding_mismatch" === String(lastFireAudit.type || "")) {
      result.push({ label: "目标绑定错位", tone: "danger" });
    }
    if ("cooldown_after_miss_or_room_loss" === reason || "risk_cooldown" === type) {
      result.push({ label: "风险冷却中", tone: "warn" });
    }
    if ("weak_signal_room" === reason) {
      result.push({ label: "弱信号房", tone: "warn" });
    }
    if ("precision_non_whitelist_odds_empty" === reason) {
      result.push({ label: "非白名单空赔率", tone: "warn" });
      if (
        analysis.bestCandidate &&
        analysis.bestCandidate.scoreInfo &&
        analysis.bestCandidate.scoreInfo.allowEmptyOddsProbe
      ) {
        result.push({ label: "可探测放行", tone: "good" });
      }
    }
    if ("blocked_room_timeout" === reason) {
      result.push({ label: "阻塞超时切房", tone: "warn" });
    }
    if ("target_lost_before_fire" === reason) {
      result.push({ label: "目标已丢失", tone: "warn" });
    }
    if ("target_not_stable_enough" === reason) {
      result.push({ label: "目标不稳定", tone: "warn" });
    }
    if ("hit_probability_too_low" === reason) {
      result.push({ label: "命中率不足", tone: "warn" });
    }
    if ("insufficient_balance" === reason) {
      result.push({ label: "余额不足", tone: "danger" });
    }
    if ("manual_fire_cooldown" === reason) {
      result.push({ label: "开火冷却", tone: "accent" });
    }
    if ("combat_syncing_min_bet" === reason) {
      result.push({ label: "高炮归一中", tone: "warn" });
    }
    if ("combat_syncing_target_bet" === reason) {
      result.push({ label: "炮位同步中", tone: "warn" });
    }
    if ("manual_fire" === reason || "probe_fire" === reason || "attack" === type) {
      result.push({ label: "已触发开火", tone: "good" });
    }
    if ("probe_fire" === reason) {
      result.push({ label: "探测开火", tone: "good" });
    }
    if ("scan_unconfirmed_timeout" === reason) {
      result.push({ label: "扫描超时切房", tone: "warn" });
    }
    if ("no_candidate_timeout" === reason || "leave_room" === type) {
      result.push({ label: "无鱼切房", tone: "warn" });
    }
    if ("manual_stop" === reason || "stopped" === type) {
      result.push({ label: "已手动停止", tone: "accent" });
    }
    if ("panel_error" === type || "error" === type) {
      result.push({ label: "执行异常", tone: "danger" });
    }

    if (!result.length) {
      if ("room" !== String(roomStatus.status || "")) {
        result.push({ label: "等待进房", tone: "accent" });
      } else if ((Number(analysis.candidateCount || 0) || 0) <= 0) {
        result.push({ label: "同屏无候选鱼", tone: "warn" });
      } else {
        result.push({ label: "运行监控中", tone: "good" });
      }
    }
    return result;
  }

  function buildPanelOverviewHtml(status) {
    var data = pickObject(status);
    var roomStatus = pickObject(data.lastRoomStatus);
    var analysis = pickObject(data.lastAnalysis);
    var playerRuntime = pickObject(data.playerRuntime);
    var betRuntime = pickObject(data.betRuntime);
    var stopLossState = pickObject(data.stopLossState);
    var capture = pickObject(data.capture);
    var lastDecision = pickObject(data.lastDecision);
    var platformWaterProfile = pickObject(data.platformWaterProfile);
    var platformWaterActionGuard = pickObject(data.platformWaterActionGuard);
    var lastDesired = pickObject(data.lastDesired);
    var combatPolicy = pickObject(lastDesired.combatPolicy);
    if (!Object.keys(combatPolicy).length) {
      combatPolicy = {
        allowCombat: !!lastDecision.combatPolicyAllowCombat,
        probeOnly: !!lastDecision.combatPolicyProbeOnly,
        level: String(lastDecision.combatPolicyLevel || ""),
        reason: String(lastDecision.combatPolicyReason || ""),
      };
    }
    var mechanismSummary = pickObject(data.mechanismSummary);
    var pendingFireOutcome = pickObject(data.pendingFireOutcome);
    var lastResolvedFireOutcome = pickObject(data.lastResolvedFireOutcome);
    var lastFireAudit = pickObject(data.lastFireAudit);
    var adaptiveBlacklistTargetIds = cloneArray(data.adaptiveBlacklistTargetIds);
    var adaptiveBlacklistOdds = cloneArray(data.adaptiveBlacklistOdds);
    var latestAdaptiveBlacklistTarget = pickObject(data.latestAdaptiveBlacklistTarget);
    var latestAdaptiveBlacklistOdd = pickObject(data.latestAdaptiveBlacklistOdd);
    var bestCandidate = pickObject(analysis.bestCandidate);
    var pendingLeavePlan = pickObject(data.pendingLeavePlan);
    var pendingLeaveRemainingSec =
      Number(pendingLeavePlan.dueAt || 0) > Date.now()
        ? Math.max(Math.ceil((Number(pendingLeavePlan.dueAt || 0) - Date.now()) / 1000), 0)
        : 0;
    var stateText = "leave_room_pending" === String(lastDecision.type || "")
      ? "待退出"
      : "take_profit_triggered" === String(lastDecision.type || "")
        ? "止盈锁定"
      : data.stopLatched
        ? "止损锁定"
      : data.active
        ? "运行中"
        : "未启动";
    var stateStyle = "leave_room_pending" === String(lastDecision.type || "")
      ? buildPanelBadgeStyle("rgba(247, 144, 9, 0.18)", "#f7b955")
      : "take_profit_triggered" === String(lastDecision.type || "")
        ? buildPanelBadgeStyle("rgba(18, 183, 106, 0.18)", "#6ce9a6")
      : data.stopLatched
        ? buildPanelBadgeStyle("rgba(240, 68, 56, 0.18)", "#fda29b")
      : data.active
        ? buildPanelBadgeStyle("rgba(18, 183, 106, 0.18)", "#6ce9a6")
        : buildPanelBadgeStyle("rgba(71, 84, 103, 0.22)", "#d0d5dd");
    var roomText =
      String(roomStatus.status || "-") + " / " + String(roomStatus.currentRoomSize || "-");
    var balanceTone = stopLossState.hit
      ? "danger"
      : stopLossState.takeProfitHit
        ? "good"
      : stopLossState.currentBalance <= stopLossState.stopBalance * 1.08
        ? "warn"
        : "good";
    var pnlRaw =
      stopLossState.initialBalance > 0
        ? (Number(stopLossState.currentBalance || 0) || 0) -
          (Number(stopLossState.initialBalance || 0) || 0)
        : 0;
    var pnlTone = pnlRaw < 0 ? "danger" : pnlRaw > 0 ? "good" : "accent";
    var bestCandidateText = analysis.bestCandidate
      ? getCandidateIdentityText(analysis.bestCandidate, analysis.bestCandidate.scoreInfo)
      : "暂无";
    var stableSeenTicks =
      bestCandidate && bestCandidate.scoreInfo && bestCandidate.scoreInfo.captureStats
        ? Number(bestCandidate.scoreInfo.captureStats.consecutiveSeenTicks || 0) || 0
        : 0;
    var fireText = lastDecision.type === "attack"
      ? "已开火"
      : lastDecision.type === "monitor_only"
        ? "只监听"
      : lastDecision.type === "attack_waiting"
        ? "等待开火"
        : "waiting_post_leave_rejoin" === String(lastDecision.reason || "")
          ? "退房后缓进小房"
        : "waiting_platform_water_sample" === String(lastDecision.reason || "")
          ? "放水采样中"
        : "waiting_platform_water_warmup" === String(lastDecision.reason || "")
          ? "房态未升温"
        : "waiting_platform_direct_fire_window" === String(lastDecision.reason || "")
          ? "未达直开线"
        : "platform_water_probe_ready" === String(lastDecision.reason || "")
          ? "样本到位可试探"
        : "platform_water_normal_probe" === String(lastDecision.reason || "")
          ? "常态强信号试探"
        : "waiting_platform_peer_recovery" === String(lastDecision.reason || "")
          ? "同屏回报偏冷"
        : "waiting_self_recovery" === String(lastDecision.reason || "") ||
            "waiting_self_room_recovery" === String(lastDecision.reason || "")
          ? "自身回报偏冷"
        : "self_loss_streak_precision_probe" === String(lastDecision.reason || "")
          ? "连空窄窗验证"
        : "warming_self_loss_streak_probe" === String(lastDecision.reason || "")
          ? "升温窗单发验证"
        : "waiting_self_cold_peer_hot" === String(lastDecision.reason || "")
          ? "同热自冷阻断"
        : "waiting_self_mechanism_recovery" === String(lastDecision.reason || "")
          ? "当前机制吃分"
        : "miss_streak_leave_room" === String(lastDecision.reason || "")
          ? "连空切房"
        : "precision_empty_block_leave_room" === String(lastDecision.reason || "")
          ? "空赔率阻塞切房"
        : "scan_unconfirmed_waiting" === String(lastDecision.reason || "")
          ? "扫描未确认"
          : "scan_unconfirmed_timeout" === String(lastDecision.reason || "")
            ? "扫描超时切房"
            : "waiting_high_value_target" === String(lastDecision.reason || "")
              ? "等待高价值目标"
              : String(lastDecision.reason || "-");
    var platformWaterText = platformWaterProfile.label
      ? String(platformWaterProfile.label || "-")
      : "未判断";
    var platformWaterTone = "open_suspected" === String(platformWaterProfile.level || "")
      ? "good"
      : "warming" === String(platformWaterProfile.level || "")
        ? "warn"
        : "insufficient" === String(platformWaterProfile.level || "")
          ? "accent"
          : "accent";
    var roomProfitRaw = Number(data.roomProfitRaw || 0) || 0;
    var roomProfitTone = roomProfitRaw < 0 ? "danger" : roomProfitRaw > 0 ? "good" : "accent";
    var cooldownRemainingSec =
      Number(data.riskCooldownUntil || 0) > Date.now()
        ? Math.max(Math.ceil((Number(data.riskCooldownUntil || 0) - Date.now()) / 1000), 0)
        : 0;
    var weakSignalNeutralCount = Number(data.weakSignalNeutralCount || 0) || 0;
    var remoteState = pickObject(data.remote);
    var remoteErrorText = String(remoteState.lastError || remoteState.lastConfigError || "");
    var remoteStatusText = !remoteState.loggingEnabled
      ? "已关"
      : remoteErrorText
        ? "失败"
        : Number(remoteState.lastSuccessAt || 0) > 0
          ? "已上报"
          : Number(remoteState.queueLength || 0) > 0
            ? "排队中"
            : "待触发";
    var remoteStatusTone = !remoteState.loggingEnabled
      ? "accent"
      : remoteErrorText
        ? "danger"
        : Number(remoteState.lastSuccessAt || 0) > 0
          ? "good"
          : "warn";
    var remoteErrorShort = remoteErrorText
      ? remoteErrorText.slice(0, 18) + (remoteErrorText.length > 18 ? "..." : "")
      : "-";
    var reasonBadges = getDecisionReasonBadges(status)
      .map(function (item) {
        return buildPanelReasonBadgeHtml(item.label, item.tone);
      })
      .join("");
    var decisionExplainHtml = buildPanelDecisionExplainHtml(status);
    var observationStatusHtml = buildPanelObservationStatusHtml(status);
    var modeText = data.monitorOnly ? "监听" : "实战";
    var modeTone = data.monitorOnly ? "accent" : "good";
    var guardLabel = getPlatformWaterGuardLabel(platformWaterActionGuard);
    var guardTone = getPlatformWaterGuardTone(platformWaterActionGuard);
    var guardReasonText = getPlatformWaterGuardReasonText(platformWaterActionGuard.blockReason);
    var guardRecoveryText = getPlatformWaterGuardRecoveryText(platformWaterActionGuard, 2);
    var guardReasonColor =
      "danger" === guardTone ? "#fda29b" : "good" === guardTone ? "#6ce9a6" : "#f7b955";
    var combatLabel = getCombatPolicyLabel(combatPolicy);
    var combatTone = getCombatPolicyTone(combatPolicy);
    var combatReasonText = getCombatPolicyReasonText(combatPolicy.reason);
    var guardSummaryText = platformWaterActionGuard.hardBlocked
      ? guardReasonText
      : platformWaterActionGuard.directFireReady
        ? "平台房态允许直开，但仍需候选命中率与稳定帧达标。"
        : "平台房态只用于过滤，不直接给开火绿灯。";
    var guardStatsText =
      "最近吃分 " +
      String(Number(platformWaterActionGuard.recentDrainCount || 0) || 0) +
      " / 连续 " +
      String(Number(platformWaterActionGuard.recentDrainStreak || 0) || 0) +
      " / 亏损簇 " +
      String(Number(platformWaterActionGuard.recentDrainLossCount || 0) || 0);
    var mechanismText = mechanismSummary.mechanismType
      ? String(mechanismSummary.mechanismType || "-")
      : "未识别";
    var mechanismNatureText = mechanismSummary.mechanismType
      ? String(mechanismSummary.label || "-") + " / " + String(mechanismSummary.sourceText || "-")
      : String(mechanismSummary.desc || "暂无机制样本");
    var mechanismTone = String(mechanismSummary.tone || "accent");
    var mechanismRtpText = mechanismSummary.mechanismType
      ? String(mechanismSummary.rtpText || "-")
      : "-";
    var mechanismSampleText = mechanismSummary.mechanismType
      ? String(Number(mechanismSummary.sameTypeCount || 0) || 0) +
        "/" +
        String(Number(mechanismSummary.sampleCount || 0) || 0)
      : String(Number(mechanismSummary.sampleCount || 0) || 0);
    var mechanismNetRatio = Number(mechanismSummary.recentNetRatio || 0) || 0;
    var mechanismNetText = mechanismSummary.mechanismType
      ? formatAmountValue(mechanismNetRatio * 100) + "%"
      : "-";
    var mechanismNetTone = mechanismNetRatio < 0 ? "danger" : mechanismNetRatio > 0 ? "good" : mechanismTone;
    var usablePeerNetRatio = Number(platformWaterProfile.peerUsableNetRatio || 0) || 0;
    var usablePeerNetText = formatAmountValue(usablePeerNetRatio * 100) + "%";
    var usablePeerNetTone =
      usablePeerNetRatio < 0 ? "danger" : usablePeerNetRatio > 0 ? "good" : "accent";
    var peerDesiredModeRateText = formatAmountValue((Number(platformWaterProfile.peerDesiredModeRate || 0) || 0) * 100) + "%";
    var peerDesiredModeRateTone =
      (Number(platformWaterProfile.peerDesiredModeRate || 0) || 0) < 0.35 ? "warn" : "good";
    var lastMechanismProfile = getMechanismTypeProfile(lastResolvedFireOutcome.mechanismType || "");
    var lastMechanismText = lastResolvedFireOutcome.mechanismType
      ? String(lastResolvedFireOutcome.mechanismType || "-") + " / " + String(lastMechanismProfile.label || "-")
      : "-";
    var resolvedTargetStat = pickObject(lastResolvedFireOutcome.resolvedTargetStat);
    var resolvedTargetText = Number(lastResolvedFireOutcome.targetId || 0) > 0
      ? "target " + String(Number(lastResolvedFireOutcome.targetId || 0) || 0)
      : "-";
    var resolvedTargetRtpText = Number(resolvedTargetStat.sampleCount || 0) > 0
      ? formatAmountValue((Number(resolvedTargetStat.rtpRatio || 0) || 0) * 100) + "%"
      : "-";
    var resolvedTargetRtpTone = Number(resolvedTargetStat.sampleCount || 0) > 0
      ? (Number(resolvedTargetStat.rtpRatio || 0) || 0) < 0.8
        ? "danger"
        : (Number(resolvedTargetStat.rtpRatio || 0) || 0) > 1
          ? "good"
          : "warn"
      : "accent";
    var lastAuditText = !String(lastFireAudit.type || "")
      ? "-"
      : "native_fire_leak" === String(lastFireAudit.type || "")
        ? "漏枪疑似"
        : "native_fire_blocked" === String(lastFireAudit.type || "")
          ? "开火拦截" +
            (
              String(lastFireAudit.blockCode || "")
                ? "(" + String(lastFireAudit.blockCode || "") + ")"
                : ""
            )
        : "native_continuous_fire_active" === String(lastFireAudit.type || "")
          ? "原生连发活跃"
        : "native_attack_mode_drift" === String(lastFireAudit.type || "")
          ? "模式漂移"
        : "native_fire_blocked_recovery" === String(lastFireAudit.type || "")
          ? "阻塞恢复"
        : "target_binding_mismatch" === String(lastFireAudit.type || "")
          ? "目标绑错"
          : String(lastFireAudit.type || "-");
    var lastAuditTone = !String(lastFireAudit.type || "")
      ? "accent"
      : "target_binding_mismatch" === String(lastFireAudit.type || "") ||
          "native_fire_leak" === String(lastFireAudit.type || "") ||
          "native_continuous_fire_active" === String(lastFireAudit.type || "") ||
          "native_attack_mode_drift" === String(lastFireAudit.type || "")
        ? "danger"
        : "warn";
    var nativeRecoveryCount = Number(data.nativeFireRecoveryCount || 0) || 0;
    var recoveryActionText =
      Array.isArray(lastFireAudit.actions) && lastFireAudit.actions.length
        ? lastFireAudit.actions
            .filter(function (item) {
              return !!String(item || "");
            })
            .join(" -> ")
        : "-";
    var recoveryActionTone =
      "native_fire_blocked_recovery" === String(lastFireAudit.type || "")
        ? "warn"
        : nativeRecoveryCount > 0
          ? "accent"
          : "accent";
    var leakCount = Number(data.nativeFireLeakCount || 0) || 0;
    var nativeBlockedCount = Number(data.nativeFireBlockedCount || 0) || 0;
    var continuousFireCount = Number(data.nativeContinuousFireCount || 0) || 0;
    var mismatchCount = Number(data.targetBindingMismatchCount || 0) || 0;
    var lastNativeFireBlockDetail = pickObject(data.lastNativeFireBlockDetail);
    var currentAttackModeText = data.currentAttackModeLabel
      ? String(data.currentAttackModeLabel || "-")
      : getAttackModeLabel(data.currentAttackModeId);
    var currentAttackModeTone =
      Number(data.currentAttackModeId || 0) === resolveAimAttackModeId()
        ? "good"
        : Number(data.currentAttackModeId || 0) > 0
          ? "danger"
          : "warn";
    var observedSelfFireModeText =
      Number(data.lastObservedSelfFireModeId || 0) > 0
        ? String(
            data.lastObservedSelfFireModeLabel ||
              getAttackModeLabel(data.lastObservedSelfFireModeId)
          )
        : "-";
    var observedSelfFireModeTone =
      Number(data.lastObservedSelfFireModeId || 0) > 0 &&
      Number(data.lastObservedSelfFireModeId || 0) !== resolveAimAttackModeId()
        ? "danger"
        : Number(data.lastObservedSelfFireModeId || 0) > 0
          ? "warn"
          : "accent";
    var recentSelfResolvedText = formatRecentSelfResolvedSummary(
      data.recentSelfResolvedOutcomes,
      2
    );
    var recentSelfResolvedTone =
      Number(data.lastObservedSelfFireModeId || 0) > 0 &&
      Number(data.lastObservedSelfFireModeId || 0) !== resolveAimAttackModeId()
        ? "danger"
        : String(recentSelfResolvedText || "-") !== "-"
          ? "warn"
          : "accent";
    var nativeBlockedText = lastNativeFireBlockDetail.label
      ? String(lastNativeFireBlockDetail.label || "-") +
        " / code " +
        String(lastNativeFireBlockDetail.code || "-") +
        " / 排队 " +
        String(Number(lastNativeFireBlockDetail.selfBulletSize || 0) || 0) +
        " / 余弹 " +
        String(Number(lastNativeFireBlockDetail.remainBulletCount || 0) || 0)
      : "无";
    var nativeBlockedTone =
      nativeBlockedCount > 0
        ? "danger"
        : String(nativeBlockedText || "无") !== "无"
          ? "warn"
          : "accent";
    var pendingShotText = Number(pendingFireOutcome.shotId || 0) > 0
      ? "shot " + String(Number(pendingFireOutcome.shotId || 0) || 0)
      : "-";
    var pendingWaitText = Number(pendingFireOutcome.shotId || 0) > 0
      ? String(Math.max(Math.ceil((Date.now() - (Number(pendingFireOutcome.firedAt || 0) || 0)) / 1000), 0)) + "s"
      : "-";
    var adaptiveTargetCount = adaptiveBlacklistTargetIds.length;
    var adaptiveOddCount = adaptiveBlacklistOdds.length;
    var adaptiveTargetText = Number(latestAdaptiveBlacklistTarget.sampleCount || 0) > 0
      ? formatAdaptiveBlacklistSummary(latestAdaptiveBlacklistTarget, "targetId=")
      : "-";
    var adaptiveOddText = Number(latestAdaptiveBlacklistOdd.sampleCount || 0) > 0
      ? formatAdaptiveBlacklistSummary(latestAdaptiveBlacklistOdd, "odd=")
      : "-";
    var roomObservedResolvedCount = Number(data.roomObservedSelfResolvedCount || 0) || 0;
    var roomAccountedResolvedCount = Number(data.roomResolvedShotCount || 0) || 0;
    var roomUntrackedResolvedCount = Number(data.roomUntrackedSelfResolvedCount || 0) || 0;
    var resolvedAccountingText =
      String(roomObservedResolvedCount) + " / " + String(roomAccountedResolvedCount);
    var resolvedAccountingTone =
      roomUntrackedResolvedCount > 0
        ? "danger"
        : roomObservedResolvedCount > 0
          ? "warn"
          : "accent";
    return (
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
      '<div style="' + stateStyle + '">' + stateText + "</div>" +
      '<div style="font-size:11px;color:#98a2b3;">' + roomText + "</div>" +
      "</div>" +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">' +
      reasonBadges +
      "</div>" +
      '<div style="margin-bottom:8px;padding:8px;border-radius:8px;background:#0b1220;border:1px solid rgba(120,140,180,0.18);">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">' +
      buildPanelReasonBadgeHtml(guardLabel, guardTone) +
      '<div style="font-size:11px;color:#98a2b3;">' +
      escapePanelHtml(guardStatsText) +
      "</div>" +
      "</div>" +
      '<div style="font-size:11px;color:' + guardReasonColor + ';">' +
      escapePanelHtml(guardSummaryText) +
      "</div>" +
      '<div style="font-size:11px;color:#98a2b3;margin-top:4px;">恢复条件: ' +
      escapePanelHtml(guardRecoveryText) +
      "</div>" +
      '<div style="font-size:11px;color:#98a2b3;margin-top:4px;">实战门槛: ' +
      escapePanelHtml(combatLabel + " / " + combatReasonText) +
      "</div>" +
      "</div>" +
      observationStatusHtml +
      decisionExplainHtml +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">' +
      buildPanelMetricHtml("余额", formatMoneyFromRaw(playerRuntime.currentBalance || 0), balanceTone) +
      buildPanelMetricHtml("止损线", formatMoneyFromRaw(stopLossState.stopBalance || 0), "danger") +
      buildPanelMetricHtml("止盈线", formatMoneyFromRaw(stopLossState.takeProfitBalance || 0), stopLossState.takeProfitAmount > 0 ? "good" : "accent") +
      buildPanelMetricHtml("盈亏", formatMoneyFromRaw(pnlRaw), pnlTone) +
      buildPanelMetricHtml("本房盈亏", formatMoneyFromRaw(roomProfitRaw), roomProfitTone) +
      buildPanelMetricHtml("炮档", betRuntime.currentPaolevel || 0, "accent") +
      buildPanelMetricHtml("候选数", analysis.candidateCount || 0, "accent") +
      buildPanelMetricHtml("最高赔率", analysis.bestOddsMax || 0, "warn") +
      buildPanelMetricHtml("命中率", analysis.bestHitProbability || 0, (analysis.bestHitProbability || 0) >= (data.config && data.config.minHitProbability || 0) ? "good" : "warn") +
      buildPanelMetricHtml(
        "热点时段",
        getObservationTierLabel(
          bestCandidate && bestCandidate.scoreInfo
            ? bestCandidate.scoreInfo.observationHourTier
            : ""
        ),
        getObservationTierTone(
          bestCandidate && bestCandidate.scoreInfo
            ? bestCandidate.scoreInfo.observationHourTier
            : ""
        )
      ) +
      buildPanelMetricHtml(
        "热点目标",
        getObservationTierLabel(
          bestCandidate && bestCandidate.scoreInfo
            ? bestCandidate.scoreInfo.observationTargetTier
            : ""
        ),
        getObservationTierTone(
          bestCandidate && bestCandidate.scoreInfo
            ? bestCandidate.scoreInfo.observationTargetTier
            : ""
        )
      ) +
      buildPanelMetricHtml(
        "观察加分",
        "+" +
          String(
            Number(
              bestCandidate &&
                bestCandidate.scoreInfo &&
                (
                  Number(bestCandidate.scoreInfo.observationTargetBonus || 0) || 0
                ) +
                (
                  Number(bestCandidate.scoreInfo.observationHourBonus || 0) || 0
                )
            ) || 0
          ),
        (
          Number(
            bestCandidate &&
              bestCandidate.scoreInfo &&
              (
                Number(bestCandidate.scoreInfo.observationTargetBonus || 0) || 0
              ) +
              (
                Number(bestCandidate.scoreInfo.observationHourBonus || 0) || 0
              )
          ) || 0
        ) > 0
          ? "good"
          : "accent"
      ) +
      buildPanelMetricHtml("模式", modeText, modeTone) +
      buildPanelMetricHtml("平台资格", guardLabel, guardTone) +
      buildPanelMetricHtml("实战资格", combatLabel, combatTone) +
      buildPanelMetricHtml("房态", platformWaterText, platformWaterTone) +
      buildPanelMetricHtml("放水分", platformWaterProfile.score || 0, platformWaterTone) +
      buildPanelMetricHtml("mode1占比", peerDesiredModeRateText, peerDesiredModeRateTone) +
      buildPanelMetricHtml("可打净回报", usablePeerNetText, usablePeerNetTone) +
      "</div>" +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">' +
      buildPanelMetricHtml("最佳候选", bestCandidateText, bestCandidate.name ? "good" : "accent") +
      buildPanelMetricHtml("稳定帧", stableSeenTicks, stableSeenTicks >= (data.config && data.config.minStableSeenTicks || 0) ? "good" : "warn") +
      buildPanelMetricHtml("连未中", data.consecutiveMissShots || 0, (data.consecutiveMissShots || 0) > 0 ? "warn" : "accent") +
      buildPanelMetricHtml("待回执", pendingShotText, Number(pendingFireOutcome.shotId || 0) > 0 ? "warn" : "accent") +
      buildPanelMetricHtml("回执等待", pendingWaitText, Number(pendingFireOutcome.shotId || 0) > 0 ? "warn" : "accent") +
      buildPanelMetricHtml("当前攻击模式", currentAttackModeText, currentAttackModeTone) +
      buildPanelMetricHtml("真实发枪模式", observedSelfFireModeText, observedSelfFireModeTone) +
      buildPanelMetricHtml("最近真实结算", recentSelfResolvedText, recentSelfResolvedTone) +
      buildPanelMetricHtml("实结/入账", resolvedAccountingText, resolvedAccountingTone) +
      buildPanelMetricHtml("漏记结算", roomUntrackedResolvedCount, roomUntrackedResolvedCount > 0 ? "danger" : "accent") +
      buildPanelMetricHtml("原生拦截", nativeBlockedText, nativeBlockedTone) +
      buildPanelMetricHtml("拦截次数", nativeBlockedCount, nativeBlockedCount > 0 ? "danger" : "accent") +
      buildPanelMetricHtml("恢复次数", nativeRecoveryCount, nativeRecoveryCount > 0 ? "warn" : "accent") +
      buildPanelMetricHtml("恢复动作", recoveryActionText, recoveryActionTone) +
      buildPanelMetricHtml("最近审计", lastAuditText, lastAuditTone) +
      buildPanelMetricHtml("冷却", cooldownRemainingSec > 0 ? String(cooldownRemainingSec) + "s" : "0s", cooldownRemainingSec > 0 ? "warn" : "accent") +
      buildPanelMetricHtml("结算目标", resolvedTargetText, Number(lastResolvedFireOutcome.targetId || 0) > 0 ? "good" : "accent") +
      buildPanelMetricHtml("目标RTP", resolvedTargetRtpText, resolvedTargetRtpTone) +
      buildPanelMetricHtml("退房倒计时", pendingLeaveRemainingSec > 0 ? String(pendingLeaveRemainingSec) + "s" : "-", pendingLeaveRemainingSec > 0 ? "warn" : "accent") +
      buildPanelMetricHtml("动作", fireText, lastDecision.type === "attack" ? "good" : "warn") +
      "</div>"
    );
  }

  function buildFloatingPanelStyle(width, right) {
    return [
      "position:fixed",
      "top:8px",
      "right:" + String(Number(right || 8) || 8) + "px",
      "left:auto",
      "z-index:2147483647",
      "width:" + String(Number(width || 468) || 468) + "px",
      "padding:10px",
      "border-radius:10px",
      "background:rgba(14,18,28,0.92)",
      "color:#e6edf3",
      "font:12px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "box-shadow:0 8px 24px rgba(0,0,0,0.35)",
      "border:1px solid rgba(120,140,180,0.35)",
      "backdrop-filter:blur(8px)",
      "display:block",
      "overflow:visible",
      "pointer-events:auto",
    ].join(";");
  }

  function buildPanelStyle() {
    return buildFloatingPanelStyle(468, 8);
  }

  function buildWaterTrendPanelStyle() {
    return buildFloatingPanelStyle(468, 484);
  }

  function normalizePanelPosition(input, root) {
    var source = pickObject(input);
    var viewportWidth =
      "number" == typeof window.innerWidth && window.innerWidth > 0
        ? window.innerWidth
        : 1440;
    var viewportHeight =
      "number" == typeof window.innerHeight && window.innerHeight > 0
        ? window.innerHeight
        : 900;
    var panelWidth = Math.max(
      toInt(
        root && (root.offsetWidth || root.clientWidth || root.scrollWidth),
        360
      ),
      240
    );
    var panelHeight = Math.max(
      toInt(
        root && (root.offsetHeight || root.clientHeight || root.scrollHeight),
        420
      ),
      220
    );
    var maxLeft = Math.max(viewportWidth - panelWidth - 4, 0);
    var maxTop = Math.max(viewportHeight - panelHeight - 4, 0);
    var hasLeft = isFinite(Number(source.left));
    var hasTop = isFinite(Number(source.top));
    var fallbackLeft = Math.max(viewportWidth - panelWidth - 8, 0);
    return {
      left: clamp(toNumber(source.left, fallbackLeft), 0, maxLeft),
      top: clamp(toNumber(source.top, 8), 0, maxTop),
      right: "auto",
      bottom: "auto",
    };
  }

  function applyPanelPosition(root, position) {
    if (!root) {
      return null;
    }
    var normalized = normalizePanelPosition(position, root);
    root.style.left = String(Math.round(normalized.left)) + "px";
    root.style.top = String(Math.round(normalized.top)) + "px";
    root.style.right = "auto";
    root.style.bottom = "auto";
    root.setAttribute(
      "data-panel-position",
      JSON.stringify({
        left: Math.round(normalized.left),
        top: Math.round(normalized.top),
      })
    );
    return normalized;
  }

  function persistPanelPosition(position) {
    var normalized = normalizePanelPosition(position, runtimeState && runtimeState.panel && runtimeState.panel.root);
    writeLocalSettings({
      panelPosition: {
        left: Math.round(normalized.left),
        top: Math.round(normalized.top),
      },
    });
    return normalized;
  }

  function normalizeWaterTrendPanelPosition(input, root) {
    var source = pickObject(input);
    var viewportWidth =
      "number" == typeof window.innerWidth && window.innerWidth > 0
        ? window.innerWidth
        : 1440;
    var viewportHeight =
      "number" == typeof window.innerHeight && window.innerHeight > 0
        ? window.innerHeight
        : 900;
    var panelWidth = Math.max(
      toInt(
        root && (root.offsetWidth || root.clientWidth || root.scrollWidth),
        468
      ),
      280
    );
    var panelHeight = Math.max(
      toInt(
        root && (root.offsetHeight || root.clientHeight || root.scrollHeight),
        320
      ),
      220
    );
    var maxLeft = Math.max(viewportWidth - panelWidth - 4, 0);
    var maxTop = Math.max(viewportHeight - panelHeight - 4, 0);
    var fallbackLeft = Math.max(viewportWidth - panelWidth * 2 - 24, 0);
    return {
      left: clamp(toNumber(source.left, fallbackLeft), 0, maxLeft),
      top: clamp(toNumber(source.top, 8), 0, maxTop),
      right: "auto",
      bottom: "auto",
    };
  }

  function applyWaterTrendPanelPosition(root, position) {
    if (!root) {
      return null;
    }
    var normalized = normalizeWaterTrendPanelPosition(position, root);
    root.style.left = String(Math.round(normalized.left)) + "px";
    root.style.top = String(Math.round(normalized.top)) + "px";
    root.style.right = "auto";
    root.style.bottom = "auto";
    root.setAttribute(
      "data-water-trend-position",
      JSON.stringify({
        left: Math.round(normalized.left),
        top: Math.round(normalized.top),
      })
    );
    return normalized;
  }

  function persistWaterTrendPanelPosition(position) {
    var normalized = normalizeWaterTrendPanelPosition(
      position,
      runtimeState && runtimeState.panel && runtimeState.panel.waterTrendRoot
    );
    writeLocalSettings({
      panelWaterTrendPosition: {
        left: Math.round(normalized.left),
        top: Math.round(normalized.top),
      },
    });
    return normalized;
  }

  function installPanelDrag(root, dragHandle) {
    if (!root || !dragHandle || dragHandle.__OFFLINE_PANEL_DRAG_BOUND__) {
      return;
    }
    dragHandle.__OFFLINE_PANEL_DRAG_BOUND__ = true;
    dragHandle.addEventListener("mousedown", function (event) {
      if (!event || 0 !== event.button) {
        return;
      }
      event.preventDefault();
      var rect = root.getBoundingClientRect();
      var startOffsetX = event.clientX - rect.left;
      var startOffsetY = event.clientY - rect.top;
      var dragging = true;
      function handleMove(moveEvent) {
        if (!dragging) {
          return;
        }
        var next = applyPanelPosition(root, {
          left: moveEvent.clientX - startOffsetX,
          top: moveEvent.clientY - startOffsetY,
        });
        runtimeState.panel.position = next;
      }
      function handleUp(upEvent) {
        if (!dragging) {
          return;
        }
        dragging = false;
        document.removeEventListener("mousemove", handleMove, true);
        document.removeEventListener("mouseup", handleUp, true);
        var next = applyPanelPosition(root, {
          left: upEvent.clientX - startOffsetX,
          top: upEvent.clientY - startOffsetY,
        });
        runtimeState.panel.position = persistPanelPosition(next);
      }
      document.addEventListener("mousemove", handleMove, true);
      document.addEventListener("mouseup", handleUp, true);
    });
  }

  function setupPanelPlacement(root, dragHandle) {
    if (!root) {
      return;
    }
    var settings = readLocalSettings();
    var position = settings && settings.panelPosition ? settings.panelPosition : null;
    runtimeState.panel.position = applyPanelPosition(root, position);
    installPanelDrag(root, dragHandle);
  }

  function installWaterTrendPanelDrag(root, dragHandle) {
    if (!root || !dragHandle || dragHandle.__OFFLINE_WATER_TREND_DRAG_BOUND__) {
      return;
    }
    dragHandle.__OFFLINE_WATER_TREND_DRAG_BOUND__ = true;
    dragHandle.addEventListener("mousedown", function (event) {
      if (!event || 0 !== event.button) {
        return;
      }
      event.preventDefault();
      var rect = root.getBoundingClientRect();
      var startOffsetX = event.clientX - rect.left;
      var startOffsetY = event.clientY - rect.top;
      var dragging = true;
      function handleMove(moveEvent) {
        if (!dragging) {
          return;
        }
        var next = applyWaterTrendPanelPosition(root, {
          left: moveEvent.clientX - startOffsetX,
          top: moveEvent.clientY - startOffsetY,
        });
        runtimeState.panel.waterTrendPosition = next;
      }
      function handleUp(upEvent) {
        if (!dragging) {
          return;
        }
        dragging = false;
        document.removeEventListener("mousemove", handleMove, true);
        document.removeEventListener("mouseup", handleUp, true);
        var next = applyWaterTrendPanelPosition(root, {
          left: upEvent.clientX - startOffsetX,
          top: upEvent.clientY - startOffsetY,
        });
        runtimeState.panel.waterTrendPosition = persistWaterTrendPanelPosition(next);
      }
      document.addEventListener("mousemove", handleMove, true);
      document.addEventListener("mouseup", handleUp, true);
    });
  }

  function setupWaterTrendPanelPlacement(root, dragHandle) {
    if (!root) {
      return;
    }
    var settings = readLocalSettings();
    var position = settings && settings.panelWaterTrendPosition
      ? settings.panelWaterTrendPosition
      : null;
    runtimeState.panel.waterTrendPosition = applyWaterTrendPanelPosition(root, position);
    installWaterTrendPanelDrag(root, dragHandle);
  }

  function buildButtonStyle(color) {
    return [
      "appearance:none",
      "border:0",
      "border-radius:6px",
      "padding:6px 8px",
      "cursor:pointer",
      "font-size:12px",
      "font-weight:600",
      "color:#fff",
      "background:" + color,
    ].join(";");
  }

  function createPanelButton(label, color, onClick) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("data-panel-button", String(label || ""));
    button.style.cssText = buildButtonStyle(color);
    button.addEventListener("click", function (event) {
      event.preventDefault();
      try {
        onClick && onClick();
      } catch (err) {
        rememberDecision({
          type: "panel_error",
          reason: err && err.message ? err.message : String(err || ""),
          ts: Date.now(),
        });
      }
    });
    return button;
  }

  function createPanelLabeledInput(labelText, input) {
    var wrapper = document.createElement("label");
    wrapper.style.cssText = "display:flex;align-items:center;gap:6px;color:#98a2b3;font-size:11px;";
    var label = document.createElement("span");
    label.textContent = String(labelText || "-");
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return wrapper;
  }

  function readPanelInputConfig() {
    var panel = runtimeState.panel;
    var next = {};
    if (panel.stopLossRatioInput) {
      var ratio = toNumber(panel.stopLossRatioInput.value, NaN);
      if (isFinite(ratio) && ratio > 0) {
        next.stopLossRatio = ratio / 100;
      }
    }
    if (panel.takeProfitRatioInput) {
      var takeProfitRatio = toNumber(panel.takeProfitRatioInput.value, NaN);
      if (isFinite(takeProfitRatio) && takeProfitRatio >= 0) {
        next.takeProfitRatio = takeProfitRatio / 100;
      }
    }
    return next;
  }

  function syncPanelInputs() {
    var panel = runtimeState.panel;
    if (!panel.mounted) {
      return;
    }
    if (panel.stopLossRatioInput) {
      panel.stopLossRatioInput.value = String(
        Math.round((toNumber(runtimeState.config.stopLossRatio, 0.05) || 0.05) * 1000) / 10
      );
    }
    if (panel.takeProfitRatioInput) {
      panel.takeProfitRatioInput.value = String(
        Math.round((toNumber(runtimeState.config.takeProfitRatio, 0.12) || 0.12) * 1000) / 10
      );
    }
    if (panel.remoteToggleButton) {
      panel.remoteToggleButton.textContent =
        "远端" + (runtimeState.config.remoteLoggingEnabled ? "已开" : "已关");
    }
    if (panel.remoteConfigToggleButton) {
      panel.remoteConfigToggleButton.textContent =
        "配置" + (runtimeState.config.remoteConfigEnabled ? "已开" : "已关");
    }
  }

  function getRuntimeScriptVersion() {
    return String(
      window[GLOBAL_KEY] && window[GLOBAL_KEY].version ? window[GLOBAL_KEY].version : "offline"
    );
  }

  function syncPanelStatus() {
    var panel = runtimeState.panel;
    if (!panel.mounted || !panel.status) {
      return;
    }
    if (panel.versionLabel) {
      panel.versionLabel.textContent =
        "脚本 " + getRuntimeScriptVersion() + " | 面板 " + PANEL_VERSION;
    }
    var status = getStatus();
    if (panel.overview) {
      panel.overview.innerHTML = buildPanelOverviewHtml(status);
    }
    if (panel.waterTrend) {
      panel.waterTrend.innerHTML = buildPanelWaterTrendHtml(status);
    }
    panel.status.textContent = formatDecisionText(status.lastDecision);
  }

  function ensureWaterTrendPanel() {
    if ("undefined" == typeof document || !document.body) {
      return false;
    }
    var panel = runtimeState.panel;
    var existingRoot = document.getElementById("__sfs2x_offline_profit_guard_water_trend_panel__");
    var existingVersion = existingRoot && existingRoot.getAttribute
      ? String(existingRoot.getAttribute("data-panel-version") || "")
      : "";
    if (
      panel.waterTrendRoot &&
      panel.waterTrendRoot.isConnected &&
      String(panel.waterTrendRoot.getAttribute("data-panel-version") || "") === PANEL_VERSION
    ) {
      setupWaterTrendPanelPlacement(
        panel.waterTrendRoot,
        panel.waterTrendRoot.querySelector('[data-role="water-trend-drag-handle"]')
      );
      return true;
    }
    if (existingRoot && existingVersion === PANEL_VERSION) {
      panel.waterTrendRoot = existingRoot;
      panel.waterTrendVersionLabel = existingRoot.querySelector('[data-role="water-trend-version"]');
      panel.waterTrend = existingRoot.querySelector('[data-role="panel-water-trend"]');
      setupWaterTrendPanelPlacement(
        existingRoot,
        existingRoot.querySelector('[data-role="water-trend-drag-handle"]')
      );
      return true;
    }
    if (existingRoot && existingRoot.parentNode) {
      existingRoot.parentNode.removeChild(existingRoot);
    }
    panel.waterTrendRoot = null;
    panel.waterTrendVersionLabel = null;
    panel.waterTrend = null;
    panel.waterTrendPosition = null;

    var root = document.createElement("div");
    root.id = "__sfs2x_offline_profit_guard_water_trend_panel__";
    root.setAttribute("data-panel-version", PANEL_VERSION);
    root.style.cssText = buildWaterTrendPanelStyle();

    var title = document.createElement("div");
    title.textContent = "放水实时曲线";
    title.setAttribute("data-role", "water-trend-drag-handle");
    title.style.cssText =
      "font-size:14px;font-weight:700;margin-bottom:8px;cursor:move;user-select:none;display:flex;align-items:center;justify-content:space-between;gap:8px;";
    title.title = "按住拖动面板";
    root.appendChild(title);

    var versionLabel = document.createElement("div");
    versionLabel.setAttribute("data-role", "water-trend-version");
    versionLabel.style.cssText =
      "margin:-2px 0 8px;font-size:11px;line-height:1.4;color:#98a2b3;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;word-break:break-all;";
    versionLabel.textContent = "脚本 " + getRuntimeScriptVersion() + " | 实时曲线";
    root.appendChild(versionLabel);

    var waterTrend = document.createElement("div");
    waterTrend.setAttribute("data-role", "panel-water-trend");
    root.appendChild(waterTrend);

    document.body.appendChild(root);
    panel.waterTrendRoot = root;
    panel.waterTrendVersionLabel = versionLabel;
    panel.waterTrend = waterTrend;
    setupWaterTrendPanelPlacement(root, title);
    return true;
  }

  function handlePanelStart() {
    return handlePanelStartWithMode(false);
  }

  function handlePanelStartWithMode(monitorOnly) {
    var panelConfig = readPanelInputConfig();
    panelConfig.monitorOnly = !!monitorOnly;
    persistConfigToLocalSettings(panelConfig);
    return start({
      basePlanConfig: cloneObject(panelConfig),
    });
  }

  function handlePanelJoinRoom(roomSize) {
    var room = String(roomSize || runtimeState.lastRequestedRoomSize || runtimeState.config.preferredRooms[0] || "small");
    runtimeState.lastRequestedRoomSize = room;
    runtimeState.lastRoomActionAt = Date.now();
    return rememberDecision({
      type: "join_room_manual",
      reason: "panel_join_room",
      requestedRoomSize: room,
      joinResult: joinRoom({ roomSize: room }),
      ts: Date.now(),
    });
  }

  function handlePanelLeaveRoom() {
    return requestLeaveRoomWithPlan("panel_leave_room", {
      stopLoss: buildStopLossState(getSelfPlayerRuntime(), runtimeState),
      roomStatus: getRoomStatus(runtimeState.config.preferredRooms),
    });
  }

  function handlePanelToggleRemoteLogging() {
    runtimeState.config = mergeConfig({
      remoteLoggingEnabled: !runtimeState.config.remoteLoggingEnabled,
    });
    persistConfigToLocalSettings(runtimeState.config);
    syncPanelInputs();
    syncPanelStatus();
    return runtimeState.config.remoteLoggingEnabled;
  }

  function handlePanelToggleRemoteConfig() {
    runtimeState.config = mergeConfig({
      remoteConfigEnabled: !runtimeState.config.remoteConfigEnabled,
    });
    persistConfigToLocalSettings(runtimeState.config);
    syncPanelInputs();
    syncPanelStatus();
    return runtimeState.config.remoteConfigEnabled;
  }

  function ensureControlPanel() {
    if ("undefined" == typeof document || !document.body) {
      return false;
    }
    var existingRoot = document.getElementById("__sfs2x_offline_profit_guard_panel__");
    var existingRootVersion = existingRoot && existingRoot.getAttribute
      ? String(existingRoot.getAttribute("data-panel-version") || "")
      : "";
    var existingHasMonitorButton =
      !!(existingRoot && existingRoot.querySelector &&
      existingRoot.querySelector('[data-panel-button="监听"]'));
    var existingHasRemoteButton =
      !!(existingRoot && existingRoot.querySelector &&
      existingRoot.querySelector('[data-panel-button="远端开关"]'));
    var mountedRootReady =
      runtimeState.panel.mounted &&
      runtimeState.panel.root &&
      runtimeState.panel.root.isConnected &&
      runtimeState.panel.root.querySelector &&
      runtimeState.panel.root.querySelector('[data-panel-button="监听"]') &&
      runtimeState.panel.root.querySelector('[data-panel-button="远端开关"]') &&
      String(runtimeState.panel.root.getAttribute("data-panel-version") || "") === PANEL_VERSION;
    if (mountedRootReady) {
      setupPanelPlacement(
        runtimeState.panel.root,
        runtimeState.panel.root.querySelector('[data-role="panel-drag-handle"]')
      );
      ensureWaterTrendPanel();
      syncPanelInputs();
      syncPanelStatus();
      return true;
    }
    if (existingRoot && existingRootVersion === PANEL_VERSION && existingHasMonitorButton && existingHasRemoteButton) {
      runtimeState.panel.mounted = true;
      runtimeState.panel.root = existingRoot;
      runtimeState.panel.versionLabel = existingRoot.querySelector('[data-role="panel-version"]');
      runtimeState.panel.overview = existingRoot.querySelector('[data-role="panel-overview"]');
      runtimeState.panel.waterTrend = existingRoot.querySelector('[data-role="panel-water-trend"]');
      runtimeState.panel.status = existingRoot.querySelector('pre[data-role="panel-status"]');
      runtimeState.panel.stopLossRatioInput = existingRoot.querySelector('input[placeholder="止损%"]');
      runtimeState.panel.takeProfitRatioInput = existingRoot.querySelector('input[placeholder="止盈%"]');
      runtimeState.panel.remoteToggleButton = existingRoot.querySelector('[data-panel-button="远端开关"]');
      runtimeState.panel.remoteConfigToggleButton = existingRoot.querySelector('[data-panel-button="配置拉取"]');
      runtimeState.panel.initialBalanceInput = null;
      runtimeState.panel.roomSelect = null;
      setupPanelPlacement(
        existingRoot,
        existingRoot.querySelector('[data-role="panel-drag-handle"]')
      );
      ensureWaterTrendPanel();
      syncPanelInputs();
      syncPanelStatus();
      return true;
    }
    if (existingRoot && existingRoot.parentNode) {
      existingRoot.parentNode.removeChild(existingRoot);
    }
    runtimeState.panel.mounted = false;
    runtimeState.panel.root = null;
    runtimeState.panel.position = null;
    runtimeState.panel.versionLabel = null;
    runtimeState.panel.overview = null;
    runtimeState.panel.waterTrendRoot = null;
    runtimeState.panel.waterTrendPosition = null;
    runtimeState.panel.waterTrendVersionLabel = null;
    runtimeState.panel.waterTrend = null;
    runtimeState.panel.status = null;
    runtimeState.panel.initialBalanceInput = null;
    runtimeState.panel.stopLossRatioInput = null;
    runtimeState.panel.takeProfitRatioInput = null;
    runtimeState.panel.remoteToggleButton = null;
    runtimeState.panel.remoteConfigToggleButton = null;
    runtimeState.panel.roomSelect = null;

    var root = document.createElement("div");
    root.id = "__sfs2x_offline_profit_guard_panel__";
    root.setAttribute("data-panel-version", PANEL_VERSION);
    root.setAttribute("data-script-version", getRuntimeScriptVersion());
    root.style.cssText = buildPanelStyle();

    var title = document.createElement("div");
    title.textContent = "离线自动打鱼";
    title.setAttribute("data-role", "panel-drag-handle");
    title.style.cssText =
      "font-size:14px;font-weight:700;margin-bottom:8px;cursor:move;user-select:none;display:flex;align-items:center;justify-content:space-between;gap:8px;";
    title.title = "按住拖动面板";
    root.appendChild(title);

    var versionLabel = document.createElement("div");
    versionLabel.setAttribute("data-role", "panel-version");
    versionLabel.style.cssText =
      "margin:-2px 0 8px;font-size:11px;line-height:1.4;color:#98a2b3;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;word-break:break-all;";
    versionLabel.textContent =
      "脚本 " + getRuntimeScriptVersion() + " | 面板 " + PANEL_VERSION;
    root.appendChild(versionLabel);

    var formRow = document.createElement("div");
    formRow.style.cssText = "display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap;";

    var stopLossRatioInput = document.createElement("input");
    stopLossRatioInput.type = "number";
    stopLossRatioInput.placeholder = "止损%";
    stopLossRatioInput.style.cssText =
      "width:96px;padding:6px 8px;border-radius:6px;border:1px solid rgba(120,140,180,0.35);background:#0f1624;color:#fff;";
    stopLossRatioInput.value = "5";
    formRow.appendChild(createPanelLabeledInput("止损%", stopLossRatioInput));

    var takeProfitRatioInput = document.createElement("input");
    takeProfitRatioInput.type = "number";
    takeProfitRatioInput.placeholder = "止盈%";
    takeProfitRatioInput.style.cssText =
      "width:96px;padding:6px 8px;border-radius:6px;border:1px solid rgba(120,140,180,0.35);background:#0f1624;color:#fff;";
    takeProfitRatioInput.value = "12";
    formRow.appendChild(createPanelLabeledInput("止盈%", takeProfitRatioInput));
    root.appendChild(formRow);

    var row1 = document.createElement("div");
    row1.setAttribute("data-role", "panel-toolbar-primary");
    row1.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;";
    row1.appendChild(createPanelButton("启动", "#1f8b4c", handlePanelStart));
    row1.appendChild(createPanelButton("监听", "#0ea5e9", function () {
      handlePanelStartWithMode(true);
    }));
    row1.appendChild(
      createPanelButton("停止", "#b42318", function () {
        stop();
      })
    );
    row1.appendChild(
      createPanelButton("单步", "#2563eb", function () {
        tickOnce();
      })
    );
    row1.appendChild(
      createPanelButton("刷新", "#475467", function () {
        syncPanelStatus();
      })
    );
    root.appendChild(row1);

    var row2 = document.createElement("div");
    row2.setAttribute("data-role", "panel-toolbar-room");
    row2.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;";
    row2.appendChild(
      createPanelButton("进小房", "#6d28d9", function () {
        handlePanelJoinRoom("small");
      })
    );
    row2.appendChild(
      createPanelButton("进中房", "#7c3aed", function () {
        handlePanelJoinRoom("middle");
      })
    );
    row2.appendChild(
      createPanelButton("进大房", "#9333ea", function () {
        handlePanelJoinRoom("large");
      })
    );
    row2.appendChild(
      createPanelButton("退房", "#f79009", function () {
        handlePanelLeaveRoom();
      })
    );
    root.appendChild(row2);

    var row3 = document.createElement("div");
    row3.setAttribute("data-role", "panel-toolbar-remote");
    row3.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;";
    var remoteToggleButton = createPanelButton("远端开关", "#0891b2", function () {
      handlePanelToggleRemoteLogging();
    });
    var remoteConfigToggleButton = createPanelButton("配置拉取", "#0f766e", function () {
      handlePanelToggleRemoteConfig();
    });
    row3.appendChild(remoteToggleButton);
    row3.appendChild(remoteConfigToggleButton);
    row3.appendChild(
      createPanelButton("冲队列", "#1d4ed8", function () {
        flushRemoteLogQueue(true);
        syncPanelStatus();
      })
    );
    row3.appendChild(
      createPanelButton("拉配置", "#374151", function () {
        pullRemoteConfig(true);
        syncPanelStatus();
      })
    );
    row3.appendChild(
      createPanelButton("测远端", "#be185d", function () {
        testRemoteTransport();
      })
    );
    root.appendChild(row3);

    var overview = document.createElement("div");
    overview.setAttribute("data-role", "panel-overview");
    overview.style.cssText = "margin-bottom:8px;";
    root.appendChild(overview);

    var status = document.createElement("pre");
    status.setAttribute("data-role", "panel-status");
    status.style.cssText =
      "margin:0;max-height:180px;overflow:auto;padding:8px;border-radius:8px;background:#0b1220;border:1px solid rgba(120,140,180,0.25);white-space:pre-wrap;word-break:break-word;";
    root.appendChild(status);

    document.body.appendChild(root);
    runtimeState.panel.mounted = true;
    runtimeState.panel.root = root;
    setupPanelPlacement(root, title);
    runtimeState.panel.versionLabel = versionLabel;
    runtimeState.panel.overview = overview;
    runtimeState.panel.status = status;
    runtimeState.panel.initialBalanceInput = null;
    runtimeState.panel.stopLossRatioInput = stopLossRatioInput;
    runtimeState.panel.takeProfitRatioInput = takeProfitRatioInput;
    runtimeState.panel.remoteToggleButton = remoteToggleButton;
    runtimeState.panel.remoteConfigToggleButton = remoteConfigToggleButton;
    runtimeState.panel.roomSelect = null;
    stopLossRatioInput.addEventListener("change", function () {
      var next = readPanelInputConfig();
      runtimeState.config = mergeConfig(next);
      persistConfigToLocalSettings(runtimeState.config);
      syncPanelInputs();
      syncPanelStatus();
    });
    takeProfitRatioInput.addEventListener("change", function () {
      var next = readPanelInputConfig();
      runtimeState.config = mergeConfig(next);
      persistConfigToLocalSettings(runtimeState.config);
      syncPanelInputs();
      syncPanelStatus();
    });
    if (runtimeState.panel.refreshTimer) {
      clearInterval(runtimeState.panel.refreshTimer);
    }
    runtimeState.panel.refreshTimer = setInterval(function () {
      try {
        ensureWaterTrendPanel();
        syncPanelStatus();
      } catch (err) {}
    }, 1000);
    ensureWaterTrendPanel();
    syncPanelInputs();
    syncPanelStatus();
    return true;
  }

  window[GLOBAL_KEY] = {
    start: start,
    startMonitor: function (input) {
      var source = pickObject(input);
      var merged = cloneObject(source);
      merged.monitorOnly = true;
      return start(merged);
    },
    boot: boot,
    stop: stop,
    tickOnce: tickOnce,
    getStatus: getStatus,
    getCurrentScreenFish: getCurrentScreenFish,
    getRoomStatus: function () {
      return getRoomStatus(runtimeState.config.preferredRooms);
    },
    joinRoom: joinRoom,
    leaveRoom: leaveRoom,
    changeBet: changeBet,
    unlockFish: unlockFish,
    ensureControlPanel: ensureControlPanel,
    flushRemoteLogs: function () {
      return flushRemoteLogQueue(true);
    },
    pullRemoteConfig: function () {
      return pullRemoteConfig(true);
    },
    testRemoteTransport: function () {
      return testRemoteTransport();
    },
    getBuiltInStrategyPresets: getBuiltInStrategyPresets,
    applyStrategyPreset: applyStrategyPreset,
    version: "2026.09.19-standalone-native-offline-auto-fish-rigorous-v24",
  };

  if ("undefined" != typeof document) {
    if (document.body) {
      ensureControlPanel();
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        ensureControlPanel();
      });
    }
  }

  var autoBootConfig = window.__SFS2X_OFFLINE_PROFIT_GUARD_CONFIG__;
  if (
    autoBootConfig &&
    "object" == typeof autoBootConfig &&
    false !== pickObject(autoBootConfig.options).bootstrapOnLoad
  ) {
    setTimeout(function () {
      try {
        boot(autoBootConfig);
      } catch (err) {}
    }, 0);
  }
})();
