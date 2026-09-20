const loader = document.getElementById("loader");

window.addEventListener("load", () => {
  setTimeout(() => {
    if (loader) loader.classList.add("hide");
  }, 700);
});

document.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    if (loader) loader.classList.remove("hide");
  });
});

const admissionForm = document.getElementById("admissionForm");

if (admissionForm) {
  admissionForm.addEventListener("submit", async e => {
    e.preventDefault();

    const data = Object.fromEntries(
      new FormData(admissionForm)
    );

    const result = document.getElementById("result");

    result.innerText = "Submitting...";

    const response = await fetch("/api/admission", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const json = await response.json();

    result.innerText = json.message;

    if (response.ok) {
      admissionForm.reset();
    }
  });
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const result = document.getElementById("loginResult");

    result.innerText = "Logging in...";

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      result.innerText = data.message;
      return;
    }

    localStorage.setItem("token", data.token);

    if (data.user.role === "admin") {
      location.href = "/admin.html";
    } else {
      location.href = "/dashboard.html";
    }
  });
}

async function loadDashboard() {
  const token = localStorage.getItem("token");

  if (!token) {
    location.href = "/login.html";
    return;
  }

  const response = await fetch("/api/me", {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  if (!response.ok) {
    logout();
    return;
  }

  const user = await response.json();

  document.getElementById("studentName").innerText =
    "Welcome, " + user.name;
}

async function loadAdmissions() {
  const token = localStorage.getItem("token");

  if (!token) {
    location.href = "/login.html";
    return;
  }

  const response = await fetch("/api/admin/admissions", {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  if (!response.ok) {
    alert("Admin access required");
    location.href = "/login.html";
    return;
  }

  const data = await response.json();

  const tbody = document.getElementById("admissions");

  tbody.innerHTML = data.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>${item.phone}</td>
      <td>${item.email || "-"}</td>
      <td>${item.course}</td>
      <td>${item.status}</td>
      <td>
        <button onclick="updateAdmission(${item.id}, 'Approved')">
          Approve
        </button>

        <button onclick="updateAdmission(${item.id}, 'Rejected')">
          Reject
        </button>
      </td>
    </tr>
  `).join("");
}

async function updateAdmission(id, status) {
  const token = localStorage.getItem("token");

  await fetch("/api/admin/admissions/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ status })
  });

  loadAdmissions();
}

function logout() {
  localStorage.removeItem("token");
  location.href = "/login.html";
}

function registerUser() {
  const name = prompt("Enter your name:");
  const email = prompt("Enter your email:");
  const password = prompt("Create password:");

  if (!name || !email || !password) return;

  fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      email,
      password
    })
  })
  .then(r => r.json())
  .then(data => {
    alert(data.message);
  });
}