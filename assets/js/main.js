document.addEventListener('DOMContentLoaded', function () {

  // Get all "navbar-burger" elements
  var $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

  // Check if there are any nav burgers
  if ($navbarBurgers.length > 0) {

    // Add a click event on each of them
    $navbarBurgers.forEach(function ($el) {
      $el.addEventListener('click', () => {

        // Get the target from the "data-target" attribute
        var target = $el.dataset.target;
        var $target = document.getElementById(target);

        // Toggle the class on both the "navbar-burger" and the "navbar-menu"
        $el.classList.toggle('is-active');
        $target.classList.toggle('is-active');

      });
    });
  }

});



$(document).ready(function(){

  //Init ScrollMagic
	var controller = new ScrollMagic.Controller();

  //Header Parallax & Fade Timeline
  var parallaxTL = new TimelineMax();
  parallaxTL
    .fromTo('.header-bg', 1, {opacity: 3}, {opacity: 0})
    .from('.header-bg', 1 , {y: '-50%', ease:Power0.easeNone}, 0)
    ;

	//Build Scene: Header Parallax
  var headerParallax = new ScrollMagic.Scene({
    triggerElement: '.header-parallax',
    triggerHook: 1,
    duration: '200%'
  })
  .setTween(parallaxTL)
  .addTo(controller);

  //Build Scene: Section parallax
  var sectionParallax = new ScrollMagic.Scene({
    triggerElement: '.parallax-section',
    triggerHook: 1,
    duration: '200%'
  })
  .setTween(TweenMax.from('.parallax-bg', 1, {y: '-50%', ease:Power0.easeNone}))
  .addTo(controller);


    // page is now ready, initialize the calendar...
    $('#calendar-list').fullCalendar({
      defaultView: 'listWeek',
      header: false,
      googleCalendarApiKey: 'AIzaSyBD-vybT9628eWbcaQdocUzKFFFdckKWgY',
      events: {
        googleCalendarId: 'forge.community_v0ccuqq2n586emsv137jppaoeo@group.calendar.google.com'
      }
    });

    $('#calendar-month').fullCalendar({
      googleCalendarApiKey: 'AIzaSyBD-vybT9628eWbcaQdocUzKFFFdckKWgY',
      events: {
          googleCalendarId: 'forge.community_v0ccuqq2n586emsv137jppaoeo@group.calendar.google.com',
          color: '#FBCE65',
          textColor: '#52696D'
      }
    });

});
