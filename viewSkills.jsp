<%@ page import="java.sql.*" %>
<%
    try {
        Class.forName("com.mysql.cj.jdbc.Driver");
        Connection con = DriverManager.getConnection(
            "jdbc:mysql://localhost:3306/skillswap", "root", "1234567"
        );

        PreparedStatement ps = con.prepareStatement(
            "SELECT u.username, s.skill_name, s.skill_level FROM user_skills s JOIN users u ON s.user_id = u.id"
        );
        ResultSet rs = ps.executeQuery();
%>
<!DOCTYPE html>
<html>
<head>
    <title>All Skills</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="p-4">
    <h2>All Skills</h2>
    <table class="table table-bordered">
        <tr>
            <th>User</th>
            <th>Skill</th>
            <th>Level</th>
        </tr>
        <%
            while(rs.next()) {
        %>
        <tr>
            <td><%= rs.getString("username") %></td>
            <td><%= rs.getString("skill_name") %></td>
            <td><%= rs.getString("skill_level") %></td>
        </tr>
        <% } %>
    </table>
</body>
</html>
<%
    } catch(Exception e) {
        out.println("Error: " + e.getMessage());
    }
%>
