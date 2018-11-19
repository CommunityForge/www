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
      defaultView: 'list',
      duration: { weeks: 1 },
      header: false,
      googleCalendarApiKey: 'AIzaSyBD-vybT9628eWbcaQdocUzKFFFdckKWgY',
      events: {
        googleCalendarId: 'forge.community_v0ccuqq2n586emsv137jppaoeo@group.calendar.google.com'
      },
      loading: function(loading, view) {
          if (!loading && $('#upcomingevent_section').length) {
              window.setTimeout(function() {
                let events = $('#calendar-list').fullCalendar('clientEvents');
                let eventsAdded = 0;
                events.sort((a, b) => a.start > b.start);
                let now = new Date();
                for (var i in events) {
                    let e = events[i];
                    if (e.start > now) {
                        e.description = e.description || '';
                        var endFmt;
                        if (e.end - e.start > 24*60*60*1000) {
                            endFmt = "MMM Do, hmma";
                        } else {
                            endFmt = "h:mma";
                        }
                        let template = $(`
                          <div class="upcomingevent">
                            <h1 class="title is-3"><a href="${e.url}">${e.title}</a></h1>
                            <span class="event-date">${e.start.format("MMM Do, h:mma")} - 
                                                     ${e.end.format(endFmt)}</span>
                            <hr class="shorty">
                            <p>${e.description}</p>
                          </div>`)[0];
                        mySiema.append(template);
                        eventsAdded += 1;
                    }
                }
                if (eventsAdded == 0) {
                    let template = $(`
                      <div class="upcomingevent">
                        <h1 class="title is-3">No Events This Week</h1>
                        <hr class="shorty">
                        <p>Check out <a href="/events">our events page</a> to see other things are going on at Community Forge!</p>
                      </div>`)[0];
                    mySiema.append(template);
                }
                mySiema.remove(0);
              }, 250);
          }
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
