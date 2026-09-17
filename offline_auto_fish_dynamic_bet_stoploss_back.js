(function () {
  if ("undefined" == typeof window) {
    return;
  }

  var GLOBAL_KEY = "__SFS2X_OFFLINE_PROFIT_GUARD__";
  var LOCAL_SETTINGS_KEY = GLOBAL_KEY + "_LOCAL_SETTINGS_V1";
  var PANEL_VERSION = "2026.09.15-monitor-toolbar-v7";
  var MONEY_SCALE = 1000;
  var BUILT_IN_PRIMARY_TARGET_IDS = [];
  var BUILT_IN_SECONDARY_TARGET_IDS = [];
  var BUILT_IN_REMOTE_SERVICE_CONFIG = {
    enabled: true,
    loggingEnabled: true,
    configPullEnabled: true,
    serviceBaseUrl: "https://coolx.luckydeal.cn",
    ingestPath: "/api/v1/logs",
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
        "% / 高机制 " +
        formatAmountValue((Number(data.highMechanismRate || 0) || 0) * 100) +
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
          baseBetCent: 0,
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
          baseBetCent: 0,
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
      var betCentArray =
        seatProxy && "function" == typeof seatProxy.getBetCentArray
          ? seatProxy.getBetCentArray()
          : [];
      if (Array.isArray(betCentArray)) {
        for (var i = 0; i < betCentArray.length; i++) {
          var item = Number(betCentArray[i] || 0) || 0;
          if (item > 0) {
            baseBetCent = item;
            break;
          }
        }
      }
      if (!baseBetCent && currentBetCent > 0) {
        baseBetCent = currentBetCent;
      }
      var currentPaolevel =
        baseBetCent > 0 && currentBetCent > 0
          ? Math.round((currentBetCent / baseBetCent) * 1000) / 1000
          : 0;
      return {
        available: true,
        currentBetCent: currentBetCent,
        currentBetLevel: currentBetLevel,
        currentCannonIndex:
          null == currentBetLevel ? null : Number(currentBetLevel || 0) + 1,
        currentPaolevel: currentPaolevel,
        baseBetCent: baseBetCent,
      };
    } catch (err) {
      return {
        available: false,
        currentBetCent: 0,
        currentBetLevel: null,
        currentCannonIndex: null,
        currentPaolevel: 0,
        baseBetCent: 0,
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
    var kept = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item || "object" != typeof item) {
        continue;
      }
      if (!item.resolved && now - (Number(item.firedAt || 0) || 0) <= 12000) {
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
      poolFlag: !!syncOutcome.poolFlag,
      specialFeatureTypes: cloneArray(syncOutcome.specialFeatureTypes || []),
    });
    trimRecentSyncOutcomes(state);
    return state.recentSyncOutcomes;
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

  function buildPlatformWaterProfile(state) {
    var recent = trimRecentSyncOutcomes(state);
    var selfPlayerID = Number(getSelfPlayerRuntime().playerID || 0) || 0;
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
      toNumber(state.config.platformWaterBaselineHitRate, 0.2827),
      0.05,
      0.95
    );
    var baselineHighMechanismRate = clamp(
      toNumber(state.config.platformWaterBaselineHighMechanismRate, 0.0818),
      0.01,
      0.9
    );
    var highOddThreshold = Math.max(toNumber(state.config.platformWaterBigWinOddThreshold, 20), 1);
    var highMechanismRate = calcPredicateRate(recent, function (item) {
      var mechanismType = String(item.mechanismType || "");
      return "MN_048" === mechanismType || "MN_045" === mechanismType;
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
      selfHit: 0,
      selfNet: 0,
      highMechanism: 0,
      openFeature: 0,
      featureHit: 0,
      peerBigWin: 0,
      highOdd: 0,
      poolFlag: 0,
      netOddCombo: 0,
    };
    if (sampleCount >= minSamples) {
      componentScores.peerHit = clamp(((peerHitRate - baselineHitRate) / 0.12) * 24, 0, 24);
      componentScores.peerNet = clamp(((peerNetRatio + 0.01) / 0.12) * 20, 0, 20);
      componentScores.selfHit = clamp(((selfHitRate - baselineHitRate) / 0.1) * 8, 0, 8);
      componentScores.highMechanism = clamp(
        ((highMechanismRate - baselineHighMechanismRate) / 0.1) * 20,
        0,
        20
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
      if (selfNetRatio > 0) {
        componentScores.selfNet = clamp((selfNetRatio / 0.25) * 8, 0, 8);
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
    }
    score = Math.round(clamp(score, 0, 100));
    var level = "normal";
    var label = "常态房";
    if (sampleCount < minSamples) {
      level = "insufficient";
      label = "样本不足";
    } else if (score >= Math.max(toInt(state.config.platformWaterOpenScoreThreshold, 56), 30)) {
      level = "open_suspected";
      label = "疑似放水";
    } else if (score >= Math.max(toInt(state.config.platformWaterWarmScoreThreshold, 34), 20)) {
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
      highMechanismRate: highMechanismRate,
      peerBigWinRate: peerBigWinRate,
      openFeatureRate: openFeatureRate,
      openFeatureHitRate: openFeatureHitRate,
      highOddRate: highOddRate,
      poolFlagRate: poolFlagRate,
      baselineHitRate: baselineHitRate,
      baselineHighMechanismRate: baselineHighMechanismRate,
      componentScores: componentScores,
      updatedAt: Date.now(),
    };
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
      name: String(candidate.name || ""),
      fireMode: String(extra.fireMode || ""),
      resolved: false,
    };
    if (!Array.isArray(state.pendingFireOutcomes)) {
      state.pendingFireOutcomes = [];
    }
    state.pendingFireOutcomes.push(pending);
    trimPendingFireOutcomes(state);
    return pending;
  }

  function buildCombatPolicy(state, config, analysis) {
    var profile = pickObject(state && state.platformWaterProfile);
    var level = String(profile.level || "");
    var baselineHitRate = clamp(
      toNumber(config && config.platformWaterBaselineHitRate, 0.2827),
      0.05,
      0.95
    );
    var peerHitFloorRatio = clamp(toNumber(config && config.combatPeerHitFloorRatio, 0.55), 0.2, 1);
    var peerHitFloor = baselineHitRate * peerHitFloorRatio;
    var peerNetFloor = toNumber(config && config.combatPeerNetFloor, -0.05);
    var warmingPeerHitFloor = clamp(
      toNumber(config && config.combatWarmingPeerHitFloor, 0.025),
      0,
      1
    );
    var openPeerHitFloor = clamp(
      toNumber(config && config.combatOpenPeerHitFloor, 0.02),
      0,
      1
    );
    var effectivePeerHitFloor =
      "open_suspected" === level
        ? Math.min(peerHitFloor, openPeerHitFloor)
        : "warming" === level
          ? Math.min(peerHitFloor, warmingPeerHitFloor)
          : peerHitFloor;
    var selfNetFloor = toNumber(config && config.combatSelfNetFloor, -0.2);
    var selfRecoveryMinSamples = Math.max(
      toInt(config && config.combatSelfRecoveryMinSamples, 2),
      1
    );
    var roomResolvedShotCount = Math.max(toInt(state && state.roomResolvedShotCount, 0), 0);
    var roomResolvedHitCount = Math.max(toInt(state && state.roomResolvedHitCount, 0), 0);
    var roomEntryBalanceRaw = Math.max(toNumber(state && state.roomEntryBalance, 0), 0);
    var roomProfitRaw = toNumber(state && state.roomProfitRaw, 0);
    var roomNetRatio =
      roomEntryBalanceRaw > 0 ? roomProfitRaw / roomEntryBalanceRaw : 0;
    var bestCandidate = analysis && analysis.bestCandidate ? analysis.bestCandidate : null;
    var bestScoreInfo = bestCandidate && bestCandidate.scoreInfo ? bestCandidate.scoreInfo : null;
    var stableSeenTicks =
      bestScoreInfo && bestScoreInfo.captureStats
        ? Number(bestScoreInfo.captureStats.consecutiveSeenTicks || 0) || 0
        : 0;
    var probeStableTicks = Math.max(toInt(config && config.platformWaterProbeStableTicks, 3), 1);
    var probeHitProbability = Math.max(
      toNumber(config && config.platformWaterProbeHitProbability, 84),
      1
    );
    var probeScoreMin = Math.max(toNumber(config && config.platformWaterProbeScoreMin, 38), 0);
    var probeSampleMin = Math.max(toInt(config && config.platformWaterProbeSampleMin, 12), 1);
    var probeTier = String(bestScoreInfo && bestScoreInfo.tier || "");
    var strongProbeSignal = !!(
      bestCandidate &&
      ("primary" === probeTier || "secondary" === probeTier) &&
      stableSeenTicks >= probeStableTicks &&
      (Number(analysis && analysis.bestHitProbability || 0) || 0) >= probeHitProbability &&
      (
        (Number(profile.score || 0) || 0) >= probeScoreMin ||
        (Number(profile.highMechanismRate || 0) || 0) >= 0.85 ||
        (
          (Number(profile.openFeatureRate || 0) || 0) >= 0.8 &&
          (Number(profile.highOddRate || 0) || 0) >= 0.8
        )
      )
    );
    var policy = {
      allowCombat: false,
      allowMediumRamp: false,
      allowHighRamp: false,
      level: level,
      reason: "waiting_platform_water_warmup",
      probeOnly: false,
    };
    if ("open_suspected" === level) {
      policy.allowCombat = true;
      policy.allowMediumRamp = true;
      policy.allowHighRamp = true;
      policy.reason = "platform_water_open_ready";
    } else if ("warming" === level) {
      policy.allowCombat = true;
      policy.allowMediumRamp = true;
      policy.allowHighRamp = false;
      policy.reason = "platform_water_warming_ready";
    } else if ("insufficient" === level) {
      if ((Number(profile.sampleCount || 0) || 0) >= probeSampleMin && strongProbeSignal) {
        policy.allowCombat = true;
        policy.probeOnly = true;
        policy.reason = "platform_water_probe_ready";
      } else {
        policy.reason = "waiting_platform_water_sample";
      }
    } else {
      if (strongProbeSignal) {
        policy.allowCombat = true;
        policy.probeOnly = true;
        policy.reason = "platform_water_normal_probe";
      } else {
        policy.reason = "waiting_platform_water_warmup";
      }
    }
    if (!policy.allowCombat) {
      return policy;
    }
    if (policy.probeOnly) {
      if (
        !(roomResolvedHitCount > 0) &&
        roomResolvedShotCount >= selfRecoveryMinSamples &&
        roomNetRatio <= selfNetFloor
      ) {
        policy.allowCombat = false;
        policy.allowMediumRamp = false;
        policy.allowHighRamp = false;
        policy.probeOnly = false;
        policy.reason = "waiting_self_recovery";
      }
      return policy;
    }
    if (
      Number(profile.peerSampleCount || 0) > 0 &&
      Number(profile.peerNetRatio || 0) < peerNetFloor
    ) {
      policy.allowCombat = false;
      policy.allowMediumRamp = false;
      policy.allowHighRamp = false;
      policy.reason = "waiting_platform_peer_recovery";
      return policy;
    }
    if (
      Number(profile.peerSampleCount || 0) > 0 &&
      Number(profile.peerHitRate || 0) < effectivePeerHitFloor
    ) {
      policy.allowCombat = false;
      policy.allowMediumRamp = false;
      policy.allowHighRamp = false;
      policy.reason = "waiting_platform_peer_recovery";
      return policy;
    }
    if (
      !(roomResolvedHitCount > 0) &&
      roomResolvedShotCount >= selfRecoveryMinSamples &&
      roomNetRatio <= selfNetFloor
    ) {
      policy.allowCombat = false;
      policy.allowMediumRamp = false;
      policy.allowHighRamp = false;
      policy.reason = "waiting_self_recovery";
      return policy;
    }
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
      poolFlag: !!poolData.flag,
      specialFeatureTypes: specialFeatureResults.map(function (item) {
        return String(item && item.specialFeatureType || "");
      }).filter(function (item) {
        return !!item;
      }),
      raw: payload,
    };
  }

  function findPendingFireOutcomeForSync(syncOutcome, state) {
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
  }

  function applyResolvedFireOutcome(state, pending, syncOutcome) {
    if (!state || !pending || !syncOutcome) {
      return null;
    }
    var now = Date.now();
    pending.resolved = true;
    pending.resolvedAt = now;
    pending.totalWinRaw = Number(syncOutcome.totalWinRaw || 0) || 0;
    pending.killCount = Number(syncOutcome.killCount || 0) || 0;
    pending.betRaw = Number(syncOutcome.betRaw || 0) || 0;
    pending.mechanismType = String(syncOutcome.mechanismType || "");
    pending.outcome =
      pending.killCount > 0 || pending.totalWinRaw > 0 ? "hit" : "miss";
    state.lastResolvedFireOutcome = {
      shotId: Number(pending.shotId || 0) || 0,
      firedAt: Number(pending.firedAt || 0) || 0,
      resolvedAt: now,
      outcome: pending.outcome,
      targetSN: Number(pending.targetSN || syncOutcome.targetSN || 0) || 0,
      targetId: Number(pending.targetId || syncOutcome.targetId || 0) || 0,
      name: String(pending.name || ""),
      totalWinRaw: pending.totalWinRaw,
      killCount: pending.killCount,
      betRaw: pending.betRaw,
      mechanismType: pending.mechanismType,
    };
    state.roomResolvedShotCount = (Number(state.roomResolvedShotCount || 0) || 0) + 1;
    if ("hit" === pending.outcome) {
      state.roomResolvedHitCount = (Number(state.roomResolvedHitCount || 0) || 0) + 1;
      state.consecutiveMissShots = 0;
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
    }
    trimPendingFireOutcomes(state);
    syncPanelStatus();
    logResolvedOutcomeToConsole(state.lastResolvedFireOutcome);
    return state.lastResolvedFireOutcome;
  }

  function handleSyncOutcomeNotification(notificationName, payload) {
    if (
      "undefined" == typeof ProtocolEvent ||
      notificationName !== ProtocolEvent.ON_SET_SC_SYNC_DONE
    ) {
      return;
    }
    if (!runtimeState || !runtimeState.active) {
      return;
    }
    var syncOutcome = normalizeSyncOutcomePayload(payload);
    if (!syncOutcome || !(syncOutcome.playerID > 0)) {
      return;
    }
    recordRecentSyncOutcome(runtimeState, syncOutcome);
    runtimeState.platformWaterProfile = buildPlatformWaterProfile(runtimeState);
    logPlatformWaterProfileToConsole(runtimeState.platformWaterProfile);
    var selfRuntime = getSelfPlayerRuntime();
    if (Number(selfRuntime.playerID || 0) > 0 && syncOutcome.playerID !== Number(selfRuntime.playerID || 0)) {
      return;
    }
    var pending = findPendingFireOutcomeForSync(syncOutcome, runtimeState);
    if (!pending) {
      return;
    }
    applyResolvedFireOutcome(runtimeState, pending, syncOutcome);
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
      rawList = ["small", "middle", "large"];
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
    return mapped.length ? mapped : ["small", "middle", "large"];
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
    var protocol = new CSQuickRoomLoginProtocolData();
    protocol.iRoomType = Number(roomType) || 0;
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
        protocol.iPlayerID = Number(DataProxy.getInstance().selfPlayerID || 0) || 0;
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
    sendQuickRoomLoginProtocol(roomTarget.roomTableData.id);
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
        roomType: roomTarget.roomTableData.id,
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

  function getPrecisionTargetTier(config, targetId) {
    var normalizedTargetId = Number(targetId || 0) || 0;
    if (!(normalizedTargetId > 0)) {
      return "invalid";
    }
    if (includesNumber(config.precisionBlacklistTargetIds, normalizedTargetId)) {
      return "blacklist";
    }
    if (false !== config.dynamicTargeting) {
      return "neutral";
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

  function canAllowWarmingEmptyOddsPrecision(candidate, scoreInfo, state, config) {
    var item = pickObject(candidate);
    var info = pickObject(scoreInfo);
    var profile = pickObject(state && state.platformWaterProfile);
    var level = String(profile.level || "");
    if (!config.allowWarmingEmptyOddsPrecision) {
      return false;
    }
    if ("warming" !== level && "open_suspected" !== level) {
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
      Math.max(toInt(config.warmingEmptyOddsMaxShotsPerRoom, 6), 0)
    ) {
      return false;
    }
    if (
      Number(info.score || 0) <
      Math.max(toNumber(config.warmingEmptyOddsMinCandidateScore, 91), 1)
    ) {
      return false;
    }
    if (
      Number(info.hitProbability || 0) <
      Math.max(toNumber(config.warmingEmptyOddsMinHitProbability, 97), 1)
    ) {
      return false;
    }
    if (
      Number(info.captureStats && info.captureStats.consecutiveSeenTicks || 0) <
      Math.max(toInt(config.warmingEmptyOddsMinStableSeenTicks, 5), 1)
    ) {
      return false;
    }
    if (
      Number(profile.score || 0) <
      Math.max(toNumber(config.warmingEmptyOddsMinWaterScore, 32), 1)
    ) {
      return false;
    }
    if (
      Number(profile.peerNetRatio || 0) <
      toNumber(config.warmingEmptyOddsMinPeerNetRatio, 0.08)
    ) {
      return false;
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
    var precisionBonus = getPrecisionTierBonus(tier);
    var captureStats = getCandidateCaptureStats(candidate, state);
    var preferredTargetBonus = "primary" === tier ? 25 : "secondary" === tier ? 10 : 0;
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
        stabilityScore +
        attackableHistoryScore +
        oddsEmptyPenalty
    );
    var hitProbability = estimateCandidateHitProbability(candidate, {
      stabilityScore: stabilityScore,
      attackableHistoryScore: attackableHistoryScore,
      precisionBonus: precisionBonus,
    });
    return {
      score: score,
      preferredTarget: preferredTargetBonus > 0,
      preferredTargetBonus: preferredTargetBonus,
      tier: tier,
      precisionBonus: precisionBonus,
      oddsScore: oddsScore,
      distanceScore: distanceScore,
      attackableScore: attackableScore,
      touchScore: touchScore,
      stabilityScore: stabilityScore,
      attackableHistoryScore: attackableHistoryScore,
      captureStats: captureStats,
      oddsEmptyPenalty: oddsEmptyPenalty,
      hitProbability: hitProbability,
      allowEmptyOddsProbe: allowProbeForEmptyOddsCandidate(candidate, {
        tier: tier,
        captureStats: captureStats,
        hitProbability: hitProbability,
      }, config),
    };
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
    var bestScore = Number(bestCandidate && bestCandidate.score || 0) || 0;
    var bestOddsMax = Number(bestCandidate && bestCandidate.oddsMax || 0) || 0;
    var bestHitProbability = Number(bestCandidate && bestCandidate.hitProbability || 0) || 0;
    var highConfirmed =
      !!bestCandidate &&
      (bestOddsMax >= Number(config.highOddsThreshold || 0) ||
        bestScore >= Number(config.highScoreThreshold || 0));
    var mediumConfirmed =
      !!bestCandidate &&
      !highConfirmed &&
      (bestOddsMax >= Number(config.mediumOddsThreshold || 0) ||
        bestScore >= Number(config.mediumScoreThreshold || 0));
    var candidateReady =
      !!bestCandidate &&
      bestScore >= Number(config.minCandidateScore || 0) &&
      bestHitProbability >= Number(config.minHitProbability || 0) &&
      Number(bestCandidate.scoreInfo && bestCandidate.scoreInfo.captureStats && bestCandidate.scoreInfo.captureStats.consecutiveSeenTicks || 0) >=
        Math.max(toInt(config.minStableSeenTicks, 1), 1) &&
      (!bestCandidate.nativeCanAttackAvailable || bestCandidate.nativeCanAttack);
    return {
      candidateCount: analyzed.length,
      attackableCount: attackableCount,
      bestCandidate: bestCandidate,
      bestScore: bestScore,
      bestOddsMax: bestOddsMax,
      bestHitProbability: bestHitProbability,
      highConfirmed: highConfirmed,
      mediumConfirmed: mediumConfirmed,
      candidateReady: candidateReady,
      topCandidates: analyzed.slice(0, 5).map(function (item) {
        return {
          sn: item.sn,
          tableEntityID: item.tableEntityID,
          symbolID: item.symbolID,
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
      void 0 !== AttackModeTableEnum.ContFireByClickSymbol
    ) {
      return Number(AttackModeTableEnum.ContFireByClickSymbol) || 2;
    }
    return 2;
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
      if (
        attackProxy.strategy &&
        attackProxy.strategy.tableEntity &&
        attackProxy.strategy.tableEntity.isTargetSymbol
      ) {
        if (state.aimReadyAt && Date.now() >= state.aimReadyAt) {
          state.aimReadyAt = 0;
        }
        return true;
      }
      var targetMode = resolveAimAttackModeId();
      var currentMode =
        "function" == typeof attackProxy.getAttackMode
          ? Number(attackProxy.getAttackMode()) || 0
          : attackProxy.strategy &&
              attackProxy.strategy.tableEntity &&
              void 0 !== attackProxy.strategy.tableEntity.id
            ? Number(attackProxy.strategy.tableEntity.id) || 0
            : 0;
      if (currentMode !== targetMode) {
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

  function fireCandidate(candidate, state, config, mode) {
    if (!candidate || !candidate.node) {
      return {
        ok: false,
        fired: false,
        reason: "candidate_missing",
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
    if (!ensureAimMode(state, config)) {
      return {
        ok: false,
        fired: false,
        reason: state.aimReadyAt ? "aim_mode_warming" : "aim_mode_unavailable",
        waitMs: state.aimReadyAt ? Math.max(state.aimReadyAt - Date.now(), 0) : 0,
      };
    }
    var freshCandidate = config.recheckBeforeFire ? findFreshCandidateForFire(candidate) : candidate;
    if (!freshCandidate || !freshCandidate.node) {
      return {
        ok: false,
        fired: false,
        reason: "target_lost_before_fire",
      };
    }
    var freshScoreInfo = buildCandidateScore(freshCandidate, config, state);
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
    var modeName = String(mode || "");
    var probeMode = "probe" === modeName;
    var coldProbeMode = "cold_probe" === modeName;
    if (
      config.strictWhitelistWhenOddsEmpty &&
      !(Number(freshCandidate.oddsMax || 0) > 0) &&
      !isWhitelistPrecisionTier(freshScoreInfo.tier) &&
      !(probeMode && freshScoreInfo.allowEmptyOddsProbe) &&
      !warmingEmptyOddsPrecisionReady &&
      !coldProbeMode
    ) {
      return {
        ok: false,
        fired: false,
        reason: "precision_non_whitelist_odds_empty",
      };
    }
    var now = Date.now();
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
      return {
        ok: false,
        fired: false,
        reason: "native_fire_blocked",
      };
    }
    var firedViaStrategy = false;
    if (
      attackProxy.strategy &&
      "function" == typeof attackProxy.strategy.touchBegin
    ) {
      attackProxy.strategy.touchBegin(freshCandidate.node);
      firedViaStrategy = true;
    } else {
      "function" == typeof attackProxy.enableShootTimer &&
        attackProxy.enableShootTimer(false);
      attackProxy.strategy.target = freshCandidate.node;
      attackProxy.shootByManual();
    }
    "function" == typeof attackProxy.setLockedTarget &&
      attackProxy.setLockedTarget(
        Number(freshCandidate.tableEntityID || freshCandidate.symbolID || 0) || 0,
        Number(freshCandidate.sn || 0) || 0
      );
    state.lastFireAt = now;
    state.lastTarget = {
      sn: Number(freshCandidate.sn || 0) || 0,
      tableEntityID: Number(freshCandidate.tableEntityID || 0) || 0,
      symbolID: Number(freshCandidate.symbolID || 0) || 0,
      name: String(freshCandidate.name || ""),
    };
    if (warmingEmptyOddsPrecisionReady) {
      state.roomWarmingEmptyOddsFireCount =
        Math.max(toInt(state.roomWarmingEmptyOddsFireCount, 0), 0) + 1;
    }
    registerPendingFireOutcome(state, freshCandidate, now, { fireMode: modeName });
    return {
      ok: true,
      fired: true,
      reason: "manual_fire",
      fireMethod: firedViaStrategy ? "strategy_touch_begin" : "direct_manual_fire",
      target: cloneObject(state.lastTarget),
      hitProbability: Number(freshScoreInfo.hitProbability || 0) || 0,
      allowEmptyOddsProbe: !!freshScoreInfo.allowEmptyOddsProbe,
        warmingEmptyOddsPrecision: !!warmingEmptyOddsPrecisionReady,
      candidate: {
        name: String(freshCandidate.name || ""),
        tableEntityID: Number(freshCandidate.tableEntityID || 0) || 0,
        sn: Number(freshCandidate.sn || 0) || 0,
        symbolID: Number(freshCandidate.symbolID || 0) || 0,
        tier: String(freshScoreInfo.tier || ""),
        stableSeenTicks:
          Number(freshScoreInfo.captureStats && freshScoreInfo.captureStats.consecutiveSeenTicks || 0) || 0,
      },
    };
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
    if (roomResolvedHitCount > 0 && roomPeakProfitRaw > 0) {
      var maxRampStepsWithoutHighConfirmed = clamp(
        toInt(config && config.postHitMaxRampStepsWithoutHighConfirmed, 0),
        0,
        Math.max(bounds.max - bounds.min, 0)
      );
      var maxRampStepsWithHighConfirmed = clamp(
        toInt(config && config.postHitMaxRampStepsWithHighConfirmed, 1),
        0,
        Math.max(bounds.max - bounds.min, 0)
      );
      var postHitMaxPaolevel = clamp(
        bounds.min +
          (analysis.highConfirmed
            ? maxRampStepsWithHighConfirmed
            : maxRampStepsWithoutHighConfirmed),
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
      roomResolvedShotCount: 0,
      roomResolvedHitCount: 0,
      roomWarmingEmptyOddsFireCount: 0,
      consecutiveMissShots: 0,
      consecutiveMissShots: 0,
      riskCooldownUntil: 0,
      weakSignalNeutralCount: 0,
      roomRotateIndex: 0,
      roomEnteredAt: 0,
      roomReadyAt: 0,
      roomScanConfirmedAt: 0,
      roomColdValidationProbeFired: false,
      coldRoomFollowupShotsRemaining: 0,
      coldRoomFollowupUntil: 0,
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
      lastAimSwitchAt: 0,
      aimReadyAt: 0,
      lastTarget: null,
      pendingFireOutcomes: [],
      lastResolvedFireOutcome: null,
      recentSyncOutcomes: [],
      platformWaterProfile: null,
      lastConsolePlatformWaterSignature: "",
      lastConsoleResolvedShotId: 0,
      pendingLeavePlan: null,
      pendingLeaveTimer: 0,
      lastRoomStatus: null,
      lastAnalysis: null,
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
      capture: {
        tickIndex: 0,
        lastUpdatedAt: 0,
        samples: {},
      },
      panel: {
        mounted: false,
        root: null,
        refreshTimer: 0,
        overview: null,
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
        joinCooldownMs: 4000,
        roomWarmupMs: 8000,
        observeSeconds: 6,
        noCandidateLeaveSeconds: 14,
        scanUnconfirmedLeaveSeconds: 20,
        stopLossRatio: 0.05,
        takeProfitRatio: 0.12,
        maxStepPerTick: 1,
        defaultMinPaolevel: 1,
        defaultMaxPaolevel: 5,
        mediumOddsThreshold: 18,
        highOddsThreshold: 30,
        mediumScoreThreshold: 55,
        highScoreThreshold: 90,
        minCandidateScore: 40,
        minHitProbability: 56,
        minStableSeenTicks: 2,
        manualFireCooldownMs: 450,
        riskCooldownMs: 5000,
        maxConsecutiveMissShots: 4,
        maxRoomLossRatio: 0,
        maxRoomLossAmount: void 0,
        aimModeWarmupMs: 1200,
        betChangeCooldownMs: 1200,
        preferredRooms: ["small", "middle", "large"],
        dynamicTargeting: true,
        targetFishIds: BUILT_IN_PRIMARY_TARGET_IDS.slice(),
        precisionPrimaryTargetIds: BUILT_IN_PRIMARY_TARGET_IDS.slice(),
        precisionSecondaryTargetIds: BUILT_IN_SECONDARY_TARGET_IDS.slice(),
        precisionBlacklistTargetIds: [],
        strictWhitelistWhenOddsEmpty: true,
        recheckBeforeFire: true,
        autoJoin: true,
        bootstrapOnLoad: true,
        roomPaolevelConfig: {
          small: { min: 1, max: 3 },
          middle: { min: 1, max: 2 },
          large: { min: 1, max: 3 },
        },
        allowBootstrapJoinWhenUnknown: true,
        allowProbeFire: true,
        probeAfterObserveSeconds: 4,
        probeCandidateScoreThreshold: 60,
        probeHitProbabilityThreshold: 82,
        allowColdRoomValidationProbe: false,
        coldRoomValidationObserveSeconds: 24,
        coldRoomValidationMinSamples: 180,
        coldRoomValidationMinCandidateScore: 92,
        coldRoomValidationMinHitProbability: 97,
        coldRoomValidationMinStableSeenTicks: 8,
        coldRoomFollowupEnabled: true,
        coldRoomFollowupWindowSeconds: 12,
        coldRoomFollowupMaxShots: 2,
        coldRoomFollowupMinCandidateScore: 88,
        coldRoomFollowupMinHitProbability: 95,
        coldRoomFollowupMinStableSeenTicks: 4,
        allowEmptyOddsProbeForNeutral: false,
        emptyOddsProbeMinHitProbability: 90,
        emptyOddsProbeMinStableSeenTicks: 6,
        emptyOddsProbeMinDistanceOpenFireScore: 40,
        weakSignalNeutralThreshold: 6,
        weakSignalMinHitProbability: 90,
        weakSignalMinStableSeenTicks: 8,
        weakSignalMinRoomStaySeconds: 30,
        postHitMaxRampStepsWithoutHighConfirmed: 0,
        postHitMaxRampStepsWithHighConfirmed: 1,
        postHitMaxGivebackRatio: 0.65,
        postHitProfitProtectMinRaw: 0,
        postHitLeaveWhenProfitTurnsNegative: true,
        platformWaterWindowSeconds: 120,
        platformWaterMaxRecords: 320,
        platformWaterMinSamples: 36,
        platformWaterBaselineHitRate: 0.2827,
        platformWaterBaselineHighMechanismRate: 0.0818,
        platformWaterBigWinOddThreshold: 20,
        platformWaterWarmScoreThreshold: 34,
        platformWaterOpenScoreThreshold: 56,
        platformWaterInsufficientHoldSeconds: 45,
        combatPeerNetFloor: -0.05,
        combatPeerHitFloorRatio: 0.55,
        combatWarmingPeerHitFloor: 0.025,
        combatOpenPeerHitFloor: 0.02,
        combatSelfNetFloor: -0.2,
        combatSelfRecoveryMinSamples: 5,
        allowWarmingEmptyOddsPrecision: true,
        warmingEmptyOddsMinCandidateScore: 91,
        warmingEmptyOddsMinHitProbability: 95,
        warmingEmptyOddsMinStableSeenTicks: 5,
        warmingEmptyOddsMinWaterScore: 32,
        warmingEmptyOddsMinPeerNetRatio: 0,
        warmingEmptyOddsMaxShotsPerRoom: 6,
        roomMinResolvedShotsBeforeRamp: 1,
        requireRoomHitBeforeRamp: true,
        postLeaveRejoinMinDelayMs: 2000,
        postLeaveRejoinMaxDelayMs: 5000,
        humanLeaveMinDelayMs: 2000,
        humanLeaveMaxDelayMs: 5000,
        consoleLogging: true,
        remoteLoggingEnabled: builtInRemoteDefaults.remoteLoggingEnabled,
        remoteConfigEnabled: builtInRemoteDefaults.remoteConfigEnabled,
        remoteServiceBaseUrl: builtInRemoteDefaults.remoteServiceBaseUrl,
        remoteIngestPath: builtInRemoteDefaults.remoteIngestPath,
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
    if (decision && "object" == typeof decision) {
      decision.monitorOnly = !!runtimeState.config.monitorOnly;
      decision.platformWaterProfile = cloneObject(runtimeState.platformWaterProfile);
      decision.lastResolvedFireOutcome = cloneObject(runtimeState.lastResolvedFireOutcome);
      decision.pendingLeavePlan = runtimeState.pendingLeavePlan
        ? cloneObject(runtimeState.pendingLeavePlan)
        : null;
    }
    runtimeState.lastDecisionAt = Date.now();
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
    next.defaultMinPaolevel = Math.max(
      toInt(source.defaultMinPaolevel, next.defaultMinPaolevel),
      1
    );
    next.defaultMaxPaolevel = Math.max(
      toInt(source.defaultMaxPaolevel, next.defaultMaxPaolevel),
      next.defaultMinPaolevel
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
    next.postHitMaxGivebackRatio = clamp(
      toNumber(source.postHitMaxGivebackRatio, next.postHitMaxGivebackRatio),
      0.05,
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
      0.05,
      0.95
    );
    next.platformWaterBaselineHighMechanismRate = clamp(
      toNumber(
        source.platformWaterBaselineHighMechanismRate,
        next.platformWaterBaselineHighMechanismRate
      ),
      0.01,
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
    next.warmingEmptyOddsMinPeerNetRatio = clamp(
      toNumber(source.warmingEmptyOddsMinPeerNetRatio, next.warmingEmptyOddsMinPeerNetRatio),
      -1,
      5
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
    next.strictWhitelistWhenOddsEmpty =
      void 0 === source.strictWhitelistWhenOddsEmpty
        ? !!next.strictWhitelistWhenOddsEmpty
        : false !== source.strictWhitelistWhenOddsEmpty;
    next.recheckBeforeFire =
      void 0 === source.recheckBeforeFire
        ? !!next.recheckBeforeFire
        : false !== source.recheckBeforeFire;
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
    next.allowEmptyOddsProbeForNeutral = false;
    next.emptyOddsProbeMinHitProbability = Math.max(
      toNumber(source.emptyOddsProbeMinHitProbability, next.emptyOddsProbeMinHitProbability),
      90
    );
    next.emptyOddsProbeMinStableSeenTicks = Math.max(
      toInt(source.emptyOddsProbeMinStableSeenTicks, next.emptyOddsProbeMinStableSeenTicks),
      6
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
        version: String(
          window[GLOBAL_KEY] && window[GLOBAL_KEY].version ? window[GLOBAL_KEY].version : "offline"
        ),
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
      version: String(
        window[GLOBAL_KEY] && window[GLOBAL_KEY].version ? window[GLOBAL_KEY].version : "offline"
      ),
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
        targetFishIds: [],
        precisionPrimaryTargetIds: [],
        precisionSecondaryTargetIds: [],
        precisionBlacklistTargetIds: [],
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
        allowWarmingEmptyOddsPrecision: true,
        warmingEmptyOddsMinCandidateScore: 91,
        warmingEmptyOddsMinHitProbability: 95,
        warmingEmptyOddsMinStableSeenTicks: 5,
        warmingEmptyOddsMinWaterScore: 32,
        warmingEmptyOddsMinPeerNetRatio: 0,
        warmingEmptyOddsMaxShotsPerRoom: 6,
        roomMinResolvedShotsBeforeRamp: 1,
        requireRoomHitBeforeRamp: true,
        takeProfitRatio: 0.12,
        weakSignalNeutralThreshold: 6,
        weakSignalMinRoomStaySeconds: 30,
        postHitMaxRampStepsWithoutHighConfirmed: 0,
        postHitMaxRampStepsWithHighConfirmed: 1,
        postHitMaxGivebackRatio: 0.65,
        postHitProfitProtectMinRaw: 0,
        postHitLeaveWhenProfitTurnsNegative: true,
        probeAfterObserveSeconds: 5,
        probeCandidateScoreThreshold: 60,
        probeHitProbabilityThreshold: 82,
        allowColdRoomValidationProbe: false,
        coldRoomValidationObserveSeconds: 24,
        coldRoomValidationMinSamples: 180,
        coldRoomValidationMinCandidateScore: 92,
        coldRoomValidationMinHitProbability: 97,
        coldRoomValidationMinStableSeenTicks: 8,
        coldRoomFollowupEnabled: true,
        coldRoomFollowupWindowSeconds: 12,
        coldRoomFollowupMaxShots: 2,
        coldRoomFollowupMinCandidateScore: 88,
        coldRoomFollowupMinHitProbability: 95,
        coldRoomFollowupMinStableSeenTicks: 4,
        strictWhitelistWhenOddsEmpty: true,
        allowEmptyOddsProbeForNeutral: false,
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

  function buildPostLeaveRejoinDelayMs(config) {
    var minMs = Math.max(toInt(config && config.postLeaveRejoinMinDelayMs, 2000), 500);
    var maxMs = Math.max(toInt(config && config.postLeaveRejoinMaxDelayMs, 5000), minMs);
    return minMs + Math.floor(Math.random() * Math.max(maxMs - minMs + 1, 1));
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
        var rejoinDelayMs = buildPostLeaveRejoinDelayMs(runtimeState.config);
        runtimeState.nextAutoJoinAt = Date.now() + rejoinDelayMs;
        runtimeState.nextAutoJoinRoomSize = "small";
        runtimeState.lastRoomActionAt = Date.now();
        rememberDecision({
          type: "leave_room",
          reason: nextReason,
          roomStatus: roomStatus,
          roomProfitRaw: Number(extra.roomProfitRaw || 0) || 0,
          roomPeakProfitRaw: Number(extra.roomPeakProfitRaw || 0) || 0,
          roomProfitGivebackRaw: Number(extra.roomProfitGivebackRaw || 0) || 0,
          roomProfitGivebackRatio: Number(extra.roomProfitGivebackRatio || 0) || 0,
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
      runtimeState.roomReadyAt = 0;
      runtimeState.roomScanConfirmedAt = 0;
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
      runtimeState.roomEntryBalance = Number(runtimeState.lastKnownBalance || 0) || 0;
      runtimeState.roomProfitRaw = 0;
      runtimeState.roomPeakProfitRaw = 0;
      runtimeState.roomResolvedShotCount = 0;
      runtimeState.roomResolvedHitCount = 0;
      runtimeState.consecutiveMissShots = 0;
      runtimeState.riskCooldownUntil = 0;
      runtimeState.weakSignalNeutralCount = 0;
      unlockFish();
    }
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
    if (!analysis || !analysis.bestCandidate) {
      return false;
    }
    if (analysis.candidateReady) {
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
    if (
      analysis.bestCandidate.nativeCanAttackAvailable &&
      !analysis.bestCandidate.nativeCanAttack
    ) {
      return false;
    }
    if (
      !(Number(analysis.bestCandidate.oddsMax || 0) > 0) &&
      analysis.bestCandidate.scoreInfo &&
      !analysis.bestCandidate.scoreInfo.allowEmptyOddsProbe
    ) {
      return false;
    }
    if (!(Number(analysis.bestCandidate.oddsMax || 0) > 0)) {
      var probeProfileLevel = String(
        pickObject(state && state.platformWaterProfile).level || ""
      );
      if ("warming" !== probeProfileLevel && "open_suspected" !== probeProfileLevel) {
        return false;
      }
    }
    return (
      (Number(analysis.bestScore || 0) || 0) >=
        Math.max(toNumber(config.probeCandidateScoreThreshold, 20), 1) &&
      (Number(analysis.bestHitProbability || 0) || 0) >=
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
    var candidate = analysis.bestCandidate;
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
      (Number(analysis.bestScore || 0) || 0) <
      Math.max(toNumber(config.coldRoomFollowupMinCandidateScore, 88), 1)
    ) {
      return false;
    }
    if (
      (Number(analysis.bestHitProbability || 0) || 0) <
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
    if (stayMs > Math.max(toInt(config.roomWarmupMs, 6000), 0)) {
      return false;
    }
    var noCandidates = !(Number(analysis && analysis.candidateCount || 0) > 0);
    var balanceWarming = !playerRuntime.balanceAvailable || !!playerRuntime.usedFallbackBalance;
    var betWarming = !(Number(betRuntime && betRuntime.currentPaolevel || 0) > 0);
    return !!(balanceWarming || betWarming || noCandidates);
  }

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
    pullRemoteConfig(false);
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
    var betResult = applyBetStep(
      betRuntime,
      desired.desiredPaolevel,
      runtimeState,
      runtimeState.config
    );

    if (isRoomWarmupState(roomStatus, playerRuntime, betRuntime, analysis, runtimeState, runtimeState.config)) {
      unlockFish();
      return rememberDecision({
        type: "room_warmup",
        reason: "room_runtime_warming",
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        analysis: analysis,
        roomProfitRaw: runtimeState.roomProfitRaw,
        maxRoomLossRaw: maxRoomLossRaw,
        consecutiveMissShots: runtimeState.consecutiveMissShots,
        weakSignalNeutralCount: runtimeState.weakSignalNeutralCount,
        currentPaolevel: desired.currentPaolevel,
        desiredPaolevel: desired.desiredPaolevel,
        betResult: betResult,
        ts: Date.now(),
      });
    }

    if (!(runtimeState.roomReadyAt > 0)) {
      runtimeState.roomReadyAt = Date.now();
    }

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
      return requestLeaveRoomWithPlan("weak_signal_room", {
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        analysis: analysis,
        roomProfitRaw: runtimeState.roomProfitRaw,
        maxRoomLossRaw: maxRoomLossRaw,
        weakSignalNeutralCount: runtimeState.weakSignalNeutralCount,
        currentPaolevel: desired.currentPaolevel,
        desiredPaolevel: desired.desiredPaolevel,
        betResult: betResult,
      });
    }

    var probeFireReady = canProbeFire(roomStatus, analysis, runtimeState, runtimeState.config);
    var coldRoomValidationReady = canColdRoomValidationFire(
      roomStatus,
      analysis,
      runtimeState,
      runtimeState.config,
      desired.combatPolicy
    );
    var coldRoomFollowupReady = canColdRoomFollowupFire(
      roomStatus,
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
      analysis.bestCandidate.scoreInfo.allowEmptyOddsProbe
    );
    var effectiveProbeReady = !!(
      probeFireReady ||
      guardedProbeReady ||
      coldRoomValidationReady ||
      coldRoomFollowupReady
    );
    if (runtimeState.config.monitorOnly && analysis.bestCandidate) {
      unlockFish();
      return rememberDecision({
        type: "monitor_only",
        reason: analysis.candidateReady || effectiveProbeReady
          ? "listen_only_candidate_observed"
          : "listen_only_observing",
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        analysis: analysis,
        roomProfitRaw: runtimeState.roomProfitRaw,
        maxRoomLossRaw: maxRoomLossRaw,
        consecutiveMissShots: runtimeState.consecutiveMissShots,
        riskCooldownUntil: runtimeState.riskCooldownUntil,
        weakSignalNeutralCount: runtimeState.weakSignalNeutralCount,
        currentPaolevel: desired.currentPaolevel,
        desiredPaolevel: desired.currentPaolevel,
        betResult: betResult,
        ts: Date.now(),
      });
    }
    if (
      !runtimeState.config.monitorOnly &&
      !desired.combatPolicy.allowCombat &&
      !effectiveProbeReady
    ) {
      unlockFish();
      return rememberDecision({
        type: "observe",
        reason: String(desired.combatPolicy.reason || "waiting_platform_water_warmup"),
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        analysis: analysis,
        roomProfitRaw: runtimeState.roomProfitRaw,
        maxRoomLossRaw: maxRoomLossRaw,
        consecutiveMissShots: runtimeState.consecutiveMissShots,
        riskCooldownUntil: runtimeState.riskCooldownUntil,
        weakSignalNeutralCount: runtimeState.weakSignalNeutralCount,
        currentPaolevel: desired.currentPaolevel,
        desiredPaolevel: desired.desiredPaolevel,
        betResult: betResult,
        ts: Date.now(),
      });
    }
    if (
      (((analysis.candidateReady && desired.combatPolicy.allowCombat) || effectiveProbeReady)) &&
      analysis.bestCandidate
    ) {
      var fireMode =
        analysis.candidateReady && desired.combatPolicy.allowCombat
          ? "normal"
          : coldRoomFollowupReady
            ? "cold_followup"
            : coldRoomValidationReady
            ? "cold_probe"
            : "probe";
      var fireResult = fireCandidate(
        analysis.bestCandidate,
        runtimeState,
        runtimeState.config,
        fireMode
      );
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
      return rememberDecision({
        type: fireResult.fired ? "attack" : "attack_waiting",
        reason:
          (!(analysis.candidateReady && desired.combatPolicy.allowCombat)) &&
          fireResult.reason === "manual_fire"
            ? ("cold_probe" === fireMode
              ? "cold_room_probe_fire"
              : "cold_followup" === fireMode
                ? "cold_room_followup_fire"
                : "probe_fire")
            : fireResult.reason,
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        analysis: analysis,
        roomProfitRaw: runtimeState.roomProfitRaw,
        maxRoomLossRaw: maxRoomLossRaw,
        consecutiveMissShots: runtimeState.consecutiveMissShots,
        riskCooldownUntil: runtimeState.riskCooldownUntil,
        weakSignalNeutralCount: runtimeState.weakSignalNeutralCount,
        currentPaolevel: desired.currentPaolevel,
        desiredPaolevel: desired.desiredPaolevel,
        betResult: betResult,
        fireResult: fireResult,
        ts: Date.now(),
      });
    }

    unlockFish();
    var stayMs =
      runtimeState.roomEnteredAt > 0 ? Date.now() - runtimeState.roomEnteredAt : 0;
    var readyStayMs =
      runtimeState.roomReadyAt > 0 ? Date.now() - runtimeState.roomReadyAt : 0;
    var noCandidateLeaveMs = Math.max(
      toInt(runtimeState.config.noCandidateLeaveSeconds, 0),
      toInt(runtimeState.config.observeSeconds, 0)
    ) * 1000;
    var scanUnconfirmedLeaveMs = Math.max(
      toInt(runtimeState.config.scanUnconfirmedLeaveSeconds, 0),
      toInt(runtimeState.config.noCandidateLeaveSeconds, 0) + 6
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
      return requestLeaveRoomWithPlan("scan_unconfirmed_timeout", {
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        analysis: analysis,
        currentPaolevel: desired.currentPaolevel,
        desiredPaolevel: desired.desiredPaolevel,
        betResult: betResult,
        stayMs: stayMs,
        readyStayMs: readyStayMs,
        roomProfitRaw: runtimeState.roomProfitRaw,
        maxRoomLossRaw: maxRoomLossRaw,
      });
    }
    if (
      !runtimeState.config.monitorOnly &&
      noCandidateLeaveMs > 0 &&
      runtimeState.roomReadyAt > 0 &&
      runtimeState.roomScanConfirmedAt > 0 &&
      !platformWaterSamplingProtected &&
      readyStayMs >= noCandidateLeaveMs &&
      Date.now() - runtimeState.lastRoomActionAt >= runtimeState.config.joinCooldownMs
    ) {
      return requestLeaveRoomWithPlan("no_candidate_timeout", {
        stopLoss: stopLossState,
        roomStatus: roomStatus,
        analysis: analysis,
        currentPaolevel: desired.currentPaolevel,
        desiredPaolevel: desired.desiredPaolevel,
        betResult: betResult,
        stayMs: stayMs,
        readyStayMs: readyStayMs,
        roomProfitRaw: runtimeState.roomProfitRaw,
        maxRoomLossRaw: maxRoomLossRaw,
      });
    }

    return rememberDecision({
      type: "observe",
      reason:
        !(runtimeState.roomScanConfirmedAt > 0) && !(Number(analysis.candidateCount || 0) > 0)
          ? "scan_unconfirmed_waiting"
          : "waiting_high_value_target",
      stopLoss: stopLossState,
      roomStatus: roomStatus,
      analysis: analysis,
      roomProfitRaw: runtimeState.roomProfitRaw,
      maxRoomLossRaw: maxRoomLossRaw,
      consecutiveMissShots: runtimeState.consecutiveMissShots,
      riskCooldownUntil: runtimeState.riskCooldownUntil,
      weakSignalNeutralCount: runtimeState.weakSignalNeutralCount,
      currentPaolevel: desired.currentPaolevel,
      desiredPaolevel: desired.desiredPaolevel,
      betResult: betResult,
      stayMs: stayMs,
      readyStayMs: readyStayMs,
      roomScanConfirmedAt: runtimeState.roomScanConfirmedAt,
      remainingMs: runtimeState.roomReadyAt > 0 ? Math.max(noCandidateLeaveMs - readyStayMs, 0) : noCandidateLeaveMs,
      ts: Date.now(),
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
    var playerRuntime = getSelfPlayerRuntime();
    var betRuntime = getSelfBetRuntime();
    var stopLossState = buildStopLossState(playerRuntime, runtimeState);
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
      lastAimSwitchAt: runtimeState.lastAimSwitchAt,
      aimReadyAt: runtimeState.aimReadyAt,
      lastTarget: runtimeState.lastTarget,
      lastResolvedFireOutcome: runtimeState.lastResolvedFireOutcome,
      platformWaterProfile: runtimeState.platformWaterProfile,
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
    var platformWaterProfile = pickObject(data.platformWaterProfile);
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
          "% / 高机制 " +
          formatAmountValue((Number(platformWaterProfile.highMechanismRate || 0) || 0) * 100) +
          "%"
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
    if (Number(lastResolvedFireOutcome.resolvedAt || 0) > 0) {
      lines.push(
        "最近结算: " +
          ("hit" === String(lastResolvedFireOutcome.outcome || "") ? "命中" : "未中") +
          " / targetId=" +
          String(Number(lastResolvedFireOutcome.targetId || 0) || 0) +
          " / sn=" +
          String(Number(lastResolvedFireOutcome.targetSN || 0) || 0) +
          " / win " +
          formatMoneyFromRaw(lastResolvedFireOutcome.totalWinRaw || 0)
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

  function getDecisionReasonBadges(status) {
    var data = pickObject(status);
    var decision = pickObject(data.lastDecision);
    var roomStatus = pickObject(data.lastRoomStatus);
    var analysis = pickObject(data.lastAnalysis);
    var stopLossState = pickObject(data.stopLossState);
    var platformWaterProfile = pickObject(data.platformWaterProfile);
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
    if ("platform_water_probe_ready" === reason) {
      result.push({ label: "样本到位可试探", tone: "good" });
    }
    if ("platform_water_normal_probe" === reason) {
      result.push({ label: "常态强信号试探", tone: "good" });
    }
    if ("waiting_platform_peer_recovery" === reason) {
      result.push({ label: "同屏回报偏冷", tone: "warn" });
    }
    if ("waiting_self_recovery" === reason) {
      result.push({ label: "自身回报偏冷", tone: "danger" });
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
        : "platform_water_probe_ready" === String(lastDecision.reason || "")
          ? "样本到位可试探"
        : "platform_water_normal_probe" === String(lastDecision.reason || "")
          ? "常态强信号试探"
        : "waiting_platform_peer_recovery" === String(lastDecision.reason || "")
          ? "同屏回报偏冷"
        : "waiting_self_recovery" === String(lastDecision.reason || "")
          ? "自身回报偏冷"
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
    var modeText = data.monitorOnly ? "监听" : "实战";
    var modeTone = data.monitorOnly ? "accent" : "good";
    return (
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
      '<div style="' + stateStyle + '">' + stateText + "</div>" +
      '<div style="font-size:11px;color:#98a2b3;">' + roomText + "</div>" +
      "</div>" +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">' +
      reasonBadges +
      "</div>" +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">' +
      buildPanelMetricHtml("余额", formatMoneyFromRaw(playerRuntime.currentBalance || 0), balanceTone) +
      buildPanelMetricHtml("止损线", formatMoneyFromRaw(stopLossState.stopBalance || 0), "danger") +
      buildPanelMetricHtml("止盈线", formatMoneyFromRaw(stopLossState.takeProfitBalance || 0), stopLossState.takeProfitAmount > 0 ? "good" : "accent") +
      buildPanelMetricHtml("盈亏", formatMoneyFromRaw(pnlRaw), pnlTone) +
      buildPanelMetricHtml("本房盈亏", formatMoneyFromRaw(roomProfitRaw), roomProfitTone) +
      buildPanelMetricHtml("炮倍", betRuntime.currentPaolevel || 0, "accent") +
      buildPanelMetricHtml("候选数", analysis.candidateCount || 0, "accent") +
      buildPanelMetricHtml("最高赔率", analysis.bestOddsMax || 0, "warn") +
      buildPanelMetricHtml("命中率", analysis.bestHitProbability || 0, (analysis.bestHitProbability || 0) >= (data.config && data.config.minHitProbability || 0) ? "good" : "warn") +
      buildPanelMetricHtml("模式", modeText, modeTone) +
      buildPanelMetricHtml("房态", platformWaterText, platformWaterTone) +
      buildPanelMetricHtml("放水分", platformWaterProfile.score || 0, platformWaterTone) +
      "</div>" +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">' +
      buildPanelMetricHtml("最佳候选", bestCandidateText, bestCandidate.name ? "good" : "accent") +
      buildPanelMetricHtml("稳定帧", stableSeenTicks, stableSeenTicks >= (data.config && data.config.minStableSeenTicks || 0) ? "good" : "warn") +
      buildPanelMetricHtml("弱信号", weakSignalNeutralCount, weakSignalNeutralCount > 0 ? "warn" : "accent") +
      buildPanelMetricHtml("连未中", data.consecutiveMissShots || 0, (data.consecutiveMissShots || 0) > 0 ? "warn" : "accent") +
      buildPanelMetricHtml("冷却", cooldownRemainingSec > 0 ? String(cooldownRemainingSec) + "s" : "0s", cooldownRemainingSec > 0 ? "warn" : "accent") +
      buildPanelMetricHtml("退房倒计时", pendingLeaveRemainingSec > 0 ? String(pendingLeaveRemainingSec) + "s" : "-", pendingLeaveRemainingSec > 0 ? "warn" : "accent") +
      buildPanelMetricHtml("动作", fireText, lastDecision.type === "attack" ? "good" : "warn") +
      buildPanelMetricHtml("跟踪池", capture.trackedTargetCount || 0, "accent") +
      buildPanelMetricHtml("远端", remoteStatusText, remoteStatusTone) +
      buildPanelMetricHtml("队列", remoteState.queueLength || 0, Number(remoteState.queueLength || 0) > 0 ? "warn" : "accent") +
      buildPanelMetricHtml("远端错", remoteErrorShort, remoteErrorText ? "danger" : "accent") +
      "</div>"
    );
  }

  function buildPanelStyle() {
    return [
      "position:fixed",
      "top:8px",
      "left:8px",
      "z-index:2147483647",
      "width:360px",
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

  function syncPanelStatus() {
    var panel = runtimeState.panel;
    if (!panel.mounted || !panel.status) {
      return;
    }
    var status = getStatus();
    if (panel.overview) {
      panel.overview.innerHTML = buildPanelOverviewHtml(status);
    }
    panel.status.textContent = formatDecisionText(status.lastDecision);
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
      syncPanelInputs();
      syncPanelStatus();
      return true;
    }
    if (existingRoot && existingRootVersion === PANEL_VERSION && existingHasMonitorButton && existingHasRemoteButton) {
      runtimeState.panel.mounted = true;
      runtimeState.panel.root = existingRoot;
      runtimeState.panel.overview = existingRoot.children && existingRoot.children.length >= 5 ? existingRoot.children[4] : null;
      runtimeState.panel.status = existingRoot.querySelector("pre");
      runtimeState.panel.stopLossRatioInput = existingRoot.querySelector('input[placeholder="止损%"]');
      runtimeState.panel.takeProfitRatioInput = existingRoot.querySelector('input[placeholder="止盈%"]');
      runtimeState.panel.remoteToggleButton = existingRoot.querySelector('[data-panel-button="远端开关"]');
      runtimeState.panel.remoteConfigToggleButton = existingRoot.querySelector('[data-panel-button="配置拉取"]');
      runtimeState.panel.initialBalanceInput = null;
      runtimeState.panel.roomSelect = null;
      syncPanelInputs();
      syncPanelStatus();
      return true;
    }
    if (existingRoot && existingRoot.parentNode) {
      existingRoot.parentNode.removeChild(existingRoot);
    }
    runtimeState.panel.mounted = false;
    runtimeState.panel.root = null;
    runtimeState.panel.overview = null;
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
    root.style.cssText = buildPanelStyle();

    var title = document.createElement("div");
    title.textContent = "离线自动打鱼";
    title.style.cssText = "font-size:14px;font-weight:700;margin-bottom:8px;";
    root.appendChild(title);

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
    overview.style.cssText = "margin-bottom:8px;";
    root.appendChild(overview);

    var status = document.createElement("pre");
    status.style.cssText =
      "margin:0;max-height:220px;overflow:auto;padding:8px;border-radius:8px;background:#0b1220;border:1px solid rgba(120,140,180,0.25);white-space:pre-wrap;word-break:break-word;";
    root.appendChild(status);

    document.body.appendChild(root);
    runtimeState.panel.mounted = true;
    runtimeState.panel.root = root;
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
        syncPanelStatus();
      } catch (err) {}
    }, 1000);
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
    version: "2026.09.16-standalone-native-offline-auto-fish-profit-guard",
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
