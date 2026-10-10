document.addEventListener("DOMContentLoaded", () => {
    // 1. CHẾ ĐỘ TỐI (DARK MODE)
    const themeBtn = document.getElementById("theme-toggle");
    const currentTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", currentTheme);
    if (themeBtn) {
        themeBtn.textContent = currentTheme === "dark" ? "☀️" : "🌙";
        themeBtn.addEventListener("click", () => {
            const newTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);
            themeBtn.textContent = newTheme === "dark" ? "☀️" : "🌙";
        });
    }

    // 2. LOGIC TRẮC NGHIỆM 500 CÂU & RÚT NGẪU NHIÊN
    const quizContainer = document.getElementById("quiz-container");
    const filterContainer = document.getElementById("filter-container");
    const shuffleBtn = document.getElementById("shuffle-btn");

    if (!quizContainer) return;

    let fullPool = []; // Kho chứa toàn bộ 500 câu
    let currentCategory = "Tất cả";
    let activeQuestions = []; // Bộ câu hỏi đang được chọn hiển thị
    let answeredQuestions = new Set();
    let score = { correct: 0, wrong: 0 };

    // Đổi tên & icon nút từ "Trộn đề" thành "🔄 Làm mới câu hỏi"
    if (shuffleBtn) {
        shuffleBtn.innerHTML = "🔄 Làm mới câu hỏi";
    }

    fetch("data/questions.json")
        .then(res => res.json())
        .then(data => {
            fullPool = data;
            renderFilters();
            loadCategoryQuestions("Tất cả");
        })
        .catch(err => {
            quizContainer.innerHTML = `<p style="color:red; text-align:center;">Lỗi tải kho câu hỏi: ${err.message}</p>`;
        });

    // Tạo các nút Lọc theo Chương
    function renderFilters() {
        if (!filterContainer) return;
        const categories = ["Tất cả", ...new Set(fullPool.map(q => q.category))];
        
        filterContainer.innerHTML = categories.map((cat, idx) => `
            <button class="filter-btn ${idx === 0 ? 'active' : ''}" data-cat="${cat}">${cat}</button>
        `).join('');

        filterContainer.querySelectorAll(".filter-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                filterContainer.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                
                currentCategory = e.target.getAttribute("data-cat");
                loadCategoryQuestions(currentCategory);
            });
        });
    }

    // Lấy câu hỏi ngẫu nhiên theo mục chọn
    function loadCategoryQuestions(category) {
        let pool = [];
        let targetCount = 10; // Số câu mặc định cho từng chương

        if (category === "Tất cả") {
            pool = [...fullPool];
            targetCount = 50; // Cột "Tất cả" rút đúng 50 câu ngẫu nhiên
        } else {
            pool = fullPool.filter(q => q.category === category);
            targetCount = Math.min(10, pool.length); // Rút 10 câu ngẫu nhiên thuộc chương đó
        }

        // Xáo trộn kho và cắt ra số lượng câu quy định
        const shuffled = pool.sort(() => Math.random() - 0.5);
        activeQuestions = JSON.parse(JSON.stringify(shuffled.slice(0, targetCount)));

        // Xáo trộn thứ tự các đáp án A, B, C, D của từng câu
        activeQuestions.forEach(q => {
            const correctText = q.options[q.correctAnswer];
            q.options.sort(() => Math.random() - 0.5);
            q.correctAnswer = q.options.indexOf(correctText);
        });

        resetStats();
        renderQuiz();
    }

    // Nút "Làm mới câu hỏi"
    if (shuffleBtn) {
        shuffleBtn.addEventListener("click", () => {
            loadCategoryQuestions(currentCategory);
        });
    }

    function resetStats() {
        answeredQuestions.clear();
        score = { correct: 0, wrong: 0 };
        updateDashboard();
    }

    function updateDashboard() {
        const total = activeQuestions.length;
        const done = answeredQuestions.size;
        const percent = done > 0 ? Math.round((score.correct / done) * 100) : 0;

        document.getElementById("stat-progress").textContent = `${done}/${total}`;
        document.getElementById("stat-correct").textContent = score.correct;
        document.getElementById("stat-wrong").textContent = score.wrong;
        document.getElementById("stat-percent").textContent = `${percent}%`;
    }

    function renderQuiz() {
        quizContainer.innerHTML = "";

        activeQuestions.forEach((q, index) => {
            const card = document.createElement("div");
            card.className = "quiz-card";

            card.innerHTML = `
                <div class="question-header">
                    <div class="question-title">
                        <span class="question-badge">Câu ${index + 1}</span>
                        <div>${q.question}</div>
                    </div>
                    <span class="category-tag">${q.category}</span>
                </div>
                <div class="options-list">
                    ${q.options.map((opt, i) => `<button class="option-btn" data-index="${i}">${opt}</button>`).join('')}
                </div>
                <div class="explanation-box">
                    <strong>💡 Lời giải chi tiết:</strong><br>${q.explanation}
                </div>
            `;

            const optionsList = card.querySelector(".options-list");
            const explainBox = card.querySelector(".explanation-box");
            const buttons = optionsList.querySelectorAll(".option-btn");

            buttons.forEach(btn => {
                btn.addEventListener("click", () => {
                    const selectedIdx = parseInt(btn.getAttribute("data-index"));

                    // Cập nhật điểm
                    if (!answeredQuestions.has(q.id)) {
                        answeredQuestions.add(q.id);
                        if (selectedIdx === q.correctAnswer) {
                            score.correct++;
                        } else {
                            score.wrong++;
                        }
                        updateDashboard();
                    }

                    // Tô màu Đúng/Sai
                    buttons.forEach(b => b.classList.remove("correct", "wrong"));
                    buttons[q.correctAnswer].classList.add("correct");
                    if (selectedIdx !== q.correctAnswer) {
                        btn.classList.add("wrong");
                    }

                    // 🔒 Khóa chọn sau khi trả lời
                    buttons.forEach(b => {
                        b.disabled = true;
                        b.style.cursor = "not-allowed";
                        b.style.opacity = "0.85";
                    });

                    // Hiển thị lời giải
                    explainBox.classList.add("show");
                });
            });

            quizContainer.appendChild(card);
        });

        updateDashboard();
    }
});