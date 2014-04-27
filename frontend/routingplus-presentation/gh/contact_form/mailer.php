<?php
/* Set e-mail recipient */
$myemail = "info@harrymt.com";

/* Check all form inputs using check_input function */
$feedback = $_POST['inputtext'];

$subject = "Someone has sent you a message";

$message = "

Someone has sent you a message using your contact form:

$feedback

";

/* Send the message using mail() function */
mail($myemail, "", $feedback);

/* Redirect visitor to the thank you page */
header('Location: http://rp.harrymt.com/');
exit();

/* Functions we used */
function check_input($data, $problem='')
{
$data = trim($data);
$data = stripslashes($data);
$data = htmlspecialchars($data);
return $data;
}

?>