import Html exposing (Html, button, div, text, table, tr, td)
import Html.App as Html
import String
import Navigation
import UrlParser exposing (Parser, (</>), format, int, oneOf, s, string)
import Suites

type alias Model =
  { suites : Suites.Model
  , page : Page
  }

type Page
  = AllSuites
  | ASuite Int

type Msg
  = SuitesAction Suites.Action


main = Navigation.program (Navigation.makeParser urlParser)
  { init = init
  , view = view
  , update = update
  , urlUpdate = urlUpdate
  , subscriptions = subscriptions
  }

init : Result String Page -> (Model, Cmd Msg)
init result = urlUpdate result { suites = Suites.model, page = AllSuites}

urlParser : Navigation.Location -> Result String Page
urlParser location =
  UrlParser.parse identity pageParser (String.dropLeft 1 location.hash)

pageParser : Parser (Page -> a) a
pageParser =
  oneOf
    [ format AllSuites (s "suites")
    , format ASuite (s "suites" </> int)
    ]

pageToRoute : Page -> String
pageToRoute page =
  case page of
    AllSuites -> "#suites"
    ASuite id -> "#suites/" ++ (toString id)

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    SuitesAction action ->
      { model | suites = (Suites.update action model.suites) } ! []

view : Model -> Html Msg
view model =
  div [] [
    viewForRoute model
  ]


viewForRoute : Model -> Html Msg
viewForRoute model =
  case model.page of
    AllSuites ->
      Html.map (\action -> SuitesAction action) (Suites.listView model.suites)
    ASuite id ->
      let
        suite = List.head (List.filter (\suite -> suite.id == id ) model.suites)
      in
        Html.map (\action -> SuitesAction action) (Suites.singleView suite)

subscriptions : Model -> Sub Msg
subscriptions model = Sub.none

urlUpdate : Result String Page -> Model -> (Model, Cmd Msg)
urlUpdate result model =
  case Debug.log "result" result of
    Err _ -> model ! [ Navigation.modifyUrl (pageToRoute model.page)]
    Ok page -> model ! []


