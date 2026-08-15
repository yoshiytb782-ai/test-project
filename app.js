"use strict";


/* =========================================================
   基本設定
========================================================= */

const STORAGE_KEY = "stampRallyCollected";

let rallyData = null;

let collectedStamps = [];

let qrScanner = null;

let currentStamp = null;


/* =========================================================
   HTML要素
========================================================= */

const startScreen =
    document.getElementById("startScreen");

const rallyScreen =
    document.getElementById("rallyScreen");

const stampScreen =
    document.getElementById("stampScreen");

const completeScreen =
    document.getElementById("completeScreen");

const startButton =
    document.getElementById("startButton");

const scanButton =
    document.getElementById("scanButton");

const closeScannerButton =
    document.getElementById("closeScannerButton");

const backButton =
    document.getElementById("backButton");

const restartButton =
    document.getElementById("restartButton");

const stampList =
    document.getElementById("stampList");

const progressText =
    document.getElementById("progressText");

const messageArea =
    document.getElementById("messageArea");

const stampTitle =
    document.getElementById("stampTitle");

const stampMessage =
    document.getElementById("stampMessage");

const stampModel =
    document.getElementById("stampModel");

const scannerArea =
    document.getElementById("scannerArea");

const titleElement =
    document.getElementById("title");

const descriptionElement =
    document.getElementById("description");

const rallyTitle =
    document.getElementById("rallyTitle");

const completeMovie =
    document.getElementById("completeMovie");


/* =========================================================
   初期処理
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    try {

        await loadRallyData();

        loadCollectedStamps();

        applyRallyData();

        checkStartParameter();

    } catch (error) {

        console.error(error);

        showError(
            "設定ファイルを読み込めませんでした。"
        );
    }
}


/* =========================================================
   JSON読み込み
========================================================= */

async function loadRallyData() {

    const response =
        await fetch("rally.json");

    if (!response.ok) {

        throw new Error(
            "rally.jsonの読み込みに失敗しました。"
        );
    }

    rallyData =
        await response.json();
}


/* =========================================================
   設定反映
========================================================= */

function applyRallyData() {

    if (!rallyData) {
        return;
    }

    titleElement.textContent =
        rallyData.title;

    descriptionElement.textContent =
        rallyData.description;

    rallyTitle.textContent =
        rallyData.title;

    completeMovie.src =
        rallyData.congratulationsMovie;
}


/* =========================================================
   URLパラメータ確認
========================================================= */

function checkStartParameter() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const start =
        params.get("start");

    const stamp =
        params.get("stamp");


    /*
     * ?start=1
     *
     * スタートQRからアクセスした場合
     */
    if (start === "1") {

        showRallyScreen();

        return;
    }


    /*
     * ?stamp=1
     *
     * URLから直接スタンプを指定した場合
     */
    if (stamp) {

        showRallyScreen();

        handleStampCode(
            stamp
        );

        return;
    }


    /*
     * 通常アクセス
     */
    showScreen(
        startScreen
    );
}


/* =========================================================
   スタートボタン
========================================================= */

startButton.addEventListener(
    "click",
    function () {

        showRallyScreen();

    }
);


/* =========================================================
   スタンプラリー画面
========================================================= */

function showRallyScreen() {

    showScreen(
        rallyScreen
    );

    renderStampList();

    updateProgress();

}


/* =========================================================
   画面切り替え
========================================================= */

function showScreen(screen) {

    const screens = [
        startScreen,
        rallyScreen,
        stampScreen,
        completeScreen
    ];

    screens.forEach(
        function (item) {

            item.classList.add(
                "hidden"
            );

        }
    );

    screen.classList.remove(
        "hidden"
    );
}


/* =========================================================
   スタンプ一覧表示
========================================================= */

function renderStampList() {

    stampList.innerHTML = "";

    rallyData.stamps.forEach(
        function (stamp) {

            const item =
                document.createElement("div");

            item.className =
                "stamp-item";


            const collected =
                collectedStamps.includes(
                    stamp.id
                );


            if (collected) {

                item.classList.add(
                    "collected"
                );
            }


            item.innerHTML = `

                <div class="stamp-number">
                    ${
                        collected
                        ? "✓"
                        : stamp.number
                    }
                </div>

                <div class="stamp-name">
                    ${escapeHtml(stamp.name)}
                </div>

                <div class="stamp-status">
                    ${
                        collected
                        ? "獲得済み"
                        : "未獲得"
                    }
                </div>

            `;


            stampList.appendChild(
                item
            );

        }
    );
}


/* =========================================================
   進捗表示
========================================================= */

function updateProgress() {

    const count =
        collectedStamps.length;

    const total =
        rallyData.totalStamps;

    progressText.textContent =
        `${count} / ${total}`;

}


/* =========================================================
   QR読み取り開始
========================================================= */

scanButton.addEventListener(
    "click",
    startScanner
);


async function startScanner() {

    clearMessage();

    scannerArea.classList.remove(
        "hidden"
    );

    scanButton.classList.add(
        "hidden"
    );


    /*
     * html5-qrcode
     */
    qrScanner =
        new Html5Qrcode("reader");


    try {

        await qrScanner.start(

            {
                facingMode: "environment"
            },

            {
                fps: 10,

                qrbox: {
                    width: 250,
                    height: 250
                }
            },

            onQrCodeSuccess,

            onQrCodeError

        );

    } catch (error) {

        console.error(error);

        showError(
            "カメラを起動できませんでした。カメラの使用を許可してください。"
        );

        stopScanner();

    }
}


/* =========================================================
   QR読み取り成功
========================================================= */

async function onQrCodeSuccess(
    decodedText
) {

    console.log(
        "QR:",
        decodedText
    );


    await stopScanner();


    /*
     * QRコードの内容を解析
     */
    const stampNumber =
        parseStampCode(
            decodedText
        );


    if (!stampNumber) {

        showError(
            "このQRコードはスタンプラリー用ではありません。"
        );

        return;
    }


    handleStampCode(
        stampNumber
    );
}


/* =========================================================
   QR読み取り中のエラー
========================================================= */

function onQrCodeError(errorMessage) {

    /*
     * QRを見つけられない状態は正常なので、
     * ここでは何もしません。
     */

}


/* =========================================================
   QRコード内容解析
========================================================= */

function parseStampCode(
    text
) {

    text =
        String(text).trim();


    /*
     * 例1
     *
     * stamp:1
     */

    const simpleMatch =
        text.match(
            /^stamp:(\d+)$/
        );


    if (simpleMatch) {

        return simpleMatch[1];
    }


    /*
     * 例2
     *
     * https://example.com/?stamp=1
     */

    try {

        const url =
            new URL(text);

        const stamp =
            url.searchParams.get(
                "stamp"
            );

        if (stamp) {

            return stamp;
        }

    } catch (error) {

        /*
         * URLではない場合は無視
         */
    }


    /*
     * どちらでもなければ無効
     */

    return null;
}


/* =========================================================
   スタンプ処理
========================================================= */

function handleStampCode(
    stampNumber
) {

    const stamp =
        rallyData.stamps.find(
            function (item) {

                return String(
                    item.number
                ) === String(
                    stampNumber
                );

            }
        );


    if (!stamp) {

        showError(
            "存在しないスタンプです。"
        );

        return;
    }


    /*
     * すでに取得している場合
     */

    if (
        collectedStamps.includes(
            stamp.id
        )
    ) {

        showMessage(
            "このスタンプはすでに獲得しています。",
            "error"
        );

        return;
    }


    /*
     * スタンプ獲得
     */

    collectedStamps.push(
        stamp.id
    );


    saveCollectedStamps();


    currentStamp =
        stamp;


    /*
     * 3Dモデル画面
     */

    showStampScreen(
        stamp
    );


    /*
     * 6個集めた場合
     */

    if (
        collectedStamps.length >=
        rallyData.totalStamps
    ) {

        /*
         * 3Dスタンプ表示後に
         * 完成画面へ進める
         */
    }
}


/* =========================================================
   スタンプ獲得画面
========================================================= */

function showStampScreen(
    stamp
) {

    stampTitle.textContent =
        `${stamp.name} 獲得！`;

    stampMessage.textContent =
        `スタンプ${stamp.number}を獲得しました！`;


    /*
     * 3Dモデルを設定
     */

    stampModel.src =
        stamp.model;


    stampModel.alt =
        stamp.name;


    showScreen(
        stampScreen
    );
}


/* =========================================================
   スタンプ一覧へ戻る
========================================================= */

backButton.addEventListener(
    "click",
    function () {

        /*
         * 全部集めた場合
         */

        if (
            collectedStamps.length >=
            rallyData.totalStamps
        ) {

            showCompleteScreen();

            return;
        }


        showRallyScreen();

    }
);


/* =========================================================
   コンプリート画面
========================================================= */

function showCompleteScreen() {

    showScreen(
        completeScreen
    );


    /*
     * 動画を最初に戻す
     */

    completeMovie.currentTime = 0;


    /*
     * 自動再生を試す
     *
     * スマートフォンではブラウザの制限により
     * 自動再生できない場合があります。
     */

    completeMovie.play()
        .catch(
            function () {

                console.log(
                    "動画の自動再生はできませんでした。"
                );

            }
        );
}


/* =========================================================
   コンプリート画面から戻る
========================================================= */

restartButton.addEventListener(
    "click",
    function () {

        showRallyScreen();

    }
);


/* =========================================================
   QRスキャナー停止
========================================================= */

closeScannerButton.addEventListener(
    "click",
    stopScanner
);


async function stopScanner() {

    if (!qrScanner) {

        scannerArea.classList.add(
            "hidden"
        );

        scanButton.classList.remove(
            "hidden"
        );

        return;
    }


    try {

        if (
            qrScanner.isScanning
        ) {

            await qrScanner.stop();
        }

    } catch (error) {

        console.error(error);
    }


    try {

        qrScanner.clear();

    } catch (error) {

        console.error(error);
    }


    qrScanner = null;


    scannerArea.classList.add(
        "hidden"
    );

    scanButton.classList.remove(
        "hidden"
    );
}


/* =========================================================
   localStorageへ保存
========================================================= */

function saveCollectedStamps() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            collectedStamps
        )
    );
}


/* =========================================================
   localStorageから読み込み
========================================================= */

function loadCollectedStamps() {

    const saved =
        localStorage.getItem(
            STORAGE_KEY
        );


    if (!saved) {

        collectedStamps = [];

        return;
    }


    try {

        const data =
            JSON.parse(saved);


        if (
            Array.isArray(data)
        ) {

            collectedStamps =
                data;

        } else {

            collectedStamps = [];

        }

    } catch (error) {

        console.error(error);

        collectedStamps = [];
    }
}


/* =========================================================
   メッセージ表示
========================================================= */

function showMessage(
    message,
    type = "success"
) {

    messageArea.textContent =
        message;

    messageArea.className =
        `message ${type}`;
}


function showError(
    message
) {

    showMessage(
        message,
        "error"
    );
}


function clearMessage() {

    messageArea.textContent = "";

    messageArea.className =
        "message";
}


/* =========================================================
   HTMLエスケープ
========================================================= */

function escapeHtml(
    text
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}
