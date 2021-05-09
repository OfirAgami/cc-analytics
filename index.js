const authUrl = "https://europe-west3-ccstatsfirestore.cloudfunctions.net/authenticator";
const url = "https://us-central1-ccstatsfirestore.cloudfunctions.net/stats-reader";

const authenticate = (password, then, error) => {
    $.ajax({
        type: "POST",
        url: authUrl,
        data: { password },
        success: response => {
            localStorage.setItem("token", response);
            then();
        },
        error: error || (() => {}),
        dataType: "text"
    })};
    
const postQuery = (query, callback, error) =>
    $.ajax({
        type: "POST",
        url: url,
        data: {
            query: query,
            token: localStorage.getItem("token")
        },
        success: callback,
        error: error,
        dataType: "json"
    });


var config = datas => ({
    type: 'bar',
    data: {
        labels: datas[0].labels,
        datasets: datas.map(data => ({
            label: data.title,
            data: data.values,
            backgroundColor: [
                data.color
            ]
        }))
    }
});
    

var fillChart = options => {
    postQuery(options.query, rawData => {
        var data = {
            values: rawData.map(d => d.value),
            labels: rawData.map(d => d.label),
            title: options.title,
            color: options.color
        };

        let ctx = document.getElementById(options.elementId).getContext('2d');
        let chart = new Chart(ctx, config([data]));
    },
    requirePassword);
}


var airVelAvgQuery = `
    select sum(avg_logs.log_value * cnt_logs.log_value) / sum(cnt_logs.log_value) as value, concat(avg_logs.level, "/", avg_logs.checkpoint) as label
    from logs as avg_logs
    join logs as cnt_logs
    on avg_logs.time between (cnt_logs.time - interval 1 second) and (cnt_logs.time + interval 1 second)
    where avg_logs.log_key="air_vel_avg" and cnt_logs.log_key = "air_vel_cnt"
    group by avg_logs.level, avg_logs.checkpoint
    `;
    
var groundVelAvgQuery = `
    select sum(avg_logs.log_value * cnt_logs.log_value) / sum(cnt_logs.log_value) as value, concat(avg_logs.level, "/", avg_logs.checkpoint) as label
    from logs as avg_logs
    join logs as cnt_logs
    on avg_logs.time between (cnt_logs.time - interval 1 second) and (cnt_logs.time + interval 1 second)
    where avg_logs.log_key="ground_vel_avg" and cnt_logs.log_key = "ground_vel_cnt"
    group by avg_logs.level, avg_logs.checkpoint
    `;
    
var airTimeQuery = `
    select avg(log_value) / 1.8 value, concat(level, "/", checkpoint) as label
    from logs
    where log_key="air_vel_cnt"
    group by level, checkpoint
    `;
    
    
var totalStageMinutesQuery = `
    select sum(log_value) / 180 as value, concat(level, "/", checkpoint) as label
    from logs
    where log_key in ("air_vel_cnt", "ground_vel_cnt")
    group by level, checkpoint
    `;
var deathsQuery = `
    select (d.deaths / t.value) as value, d.label as label from
    (
        select count(log_value) as deaths, concat(level, "/", checkpoint) as label
        from logs
        where log_key="death"
        group by level, checkpoint
    ) d
    join (${totalStageMinutesQuery}) t
    on d.label = t.label
    `;

$(".page").hide();

var afterAuthentication = () => {

    $("#passwordContainer").hide();
    $(".page").show();

    fillChart({
        elementId: "chart1",
        title: "Average air velocity",
        query: airVelAvgQuery,
        color: "#008"
    })
    
    fillChart({
        elementId: "chart2",
        title: "Average ground velocity",
        query: groundVelAvgQuery,
        color: "#044"
    })
    
    fillChart({
        elementId: "chart3",
        title: "Average % air time",
        query: airTimeQuery,
        color: "#062"
    })


    
    fillChart({
        elementId: "chart4",
        title: "Deaths per minute",
        query: deathsQuery,
        color: "#800"
    })
    
    // fillChart({
    //     elementId: "chart5",
    //     title: "Avg minutes to finish",
    //     query: airTimeQuery,
    //     color: "#404"
    // })
};

var onAuthenticationError = () => {
    requirePassword();
    $("#authMessage")[0].innerText = "Wrong password, try again.";
}

var requirePassword = () => {
    $("#passwordContainer").show();
    $(".page").hide();
}

var sendPassword = () => {
    var password = $("#passwordTextbox")[0].value;
    authenticate(password, afterAuthentication, onAuthenticationError);
}





if (localStorage.getItem("token") != null) {
    afterAuthentication();
}