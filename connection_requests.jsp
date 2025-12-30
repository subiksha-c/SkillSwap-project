<%@ page import="java.sql.*" %>
<%@ page import="javax.servlet.http.*" %>
<%
    HttpSession sessionObj = request.getSession(false);
    String username = (sessionObj != null) ? (String) sessionObj.getAttribute("username") : null;

    try {
        Class.forName("com.mysql.cj.jdbc.Driver");
        Connection con = DriverManager.getConnection(
            "jdbc:mysql://localhost:3306/skillswap", "root", "1234567"
        );

        PreparedStatement ps = con.prepareStatement(
            "SELECT from_user, message FROM connection_requests WHERE to_user = ?"
        );
        ps.setString(1, username);
        ResultSet rs = ps.executeQuery();
%>
<!DOCTYPE html>
<html>
<head>
    <title>Connection Requests</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="p-4">
    <h2>Connection Requests</h2>
    <%
        boolean hasData = false;
        while(rs.next()) {
            hasData = true;
    %>
        <div class="border p-3 mb-2 rounded">
            <strong><%= rs.getString("from_user") %></strong> sent you a request.  
            <p><%= rs.getString("message") %></p>
            <button class="btn btn-success btn-sm">Accept</button>
            <button class="btn btn-danger btn-sm">Decline</button>
        </div>
    <% } 
       if(!hasData) { %>
       <p>No connection requests found.</p>
    <% } %>
</body>
</html>
<%
    } catch(Exception e) {
        out.println("Error: " + e.getMessage());
    }
%>
