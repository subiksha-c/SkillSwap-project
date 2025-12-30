<%@ page language="java" session="true" %>
<%
    String uname = (String) session.getAttribute("username");
    if (uname == null) {
        response.sendRedirect("login.html");
        return;
    }
%>
<!DOCTYPE html>
<html>
<head>
    <title>Add Skill - SkillSwap</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(to right, #6a11cb, #2575fc);
            margin: 0;
            padding: 0;
            color: white;
        }
        .navbar {
            background: rgba(0, 0, 0, 0.2);
            padding: 15px;
            text-align: right;
        }
        .navbar a {
            color: white;
            text-decoration: none;
            margin: 0 15px;
            font-weight: bold;
        }
        .navbar a:hover {
            text-decoration: underline;
        }
        .container {
            max-width: 600px;
            margin: 60px auto;
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 0 20px rgba(0,0,0,0.3);
        }
        h2 {
            text-align: center;
        }
        form {
            display: flex;
            flex-direction: column;
        }
        input, textarea, select {
            margin: 10px 0;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
        }
        button {
            background: white;
            color: #2575fc;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: 0.3s;
        }
        button:hover {
            background: #2575fc;
            color: white;
        }
    </style>
</head>
<body>

    <div class="navbar">
        <a href="dashboard.jsp">Home</a>
        <a href="profile.jsp">My Profile</a>
        <a href="logout.jsp">Logout</a>
    </div>

    <div class="container">
        <h2>➕ Add New Skill</h2>
        <form action="AddSkillServlet" method="post">
            <input type="text" name="skillName" placeholder="Skill Name" required>
            <textarea name="description" placeholder="Describe your skill..." rows="4" required></textarea>
            <select name="category" required>
                <option value="">Select Category</option>
                <option value="Technology">Technology</option>
                <option value="Art">Art</option>
                <option value="Language">Language</option>
                <option value="Business">Business</option>
            </select>
            <button type="submit">Add Skill</button>
        </form>
    </div>

</body>
</html>